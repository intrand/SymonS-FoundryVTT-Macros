/*
Welcome to the Caster's Spellbook.
This macro was designed to facilitate casting spells from a
character with a large list of spells, like a dual class double caster
build, or a caster with multiple spellcasting entries.
This macro will sort by the spellcasting entries, available spell levels,
and finally the spells you have at those levels
Clicking on the spell expends the slot/uses/focus point and
posts the spell to the Chat Log. 
*/

if(canvas.tokens.controlled.length === 0) { return ui.notifications.warn("Please select a token"); }
if (canvas.tokens.controlled.length > 1) { return ui.notifications.warn("Please select only 1 token"); }
if (!token.actor.isSpellcaster) { return ui.notifications.warn(`${token.actor.name} is not a Spellcaster`); }

const script = async function Spells(id){
  for (const token of canvas.tokens.controlled) {
	let level;
  let spells = [];
  let buttons = {};
	const spellData = token.actor.itemTypes.spellcastingEntry.find( i => i.id === id).getSpellData();
		  spellData.levels.forEach(sp => {
			  if(!spellData.isRitual && !spellData.isPrepared && !spellData.isFlexible && !spellData.isFocusPool && !sp.isCantrip && sp.uses.value < 1) { return; }
			  sp.active.forEach((spa,index) => {
				  if(spa === null) { return; }
				  if(spa.expended) { return; }
                                  if(spa.spell.isFocusSpell && !spa.spell.isCantrip && token.actor.data.data.resources.focus.value === 0) { return; }
				  let type = 'spontaneous';
				  if (spellData.isPrepared && !spellData.isFlexible) { type = 'prepared'; }
				  if (spellData.isFocusPool) { type = 'focus'; }
				  if (spellData.isRitual) { type = 'ritual'}
				  spells.push({name: spa.spell.name, spell: spa, lvl: sp.level, type: type, index: index, sEId: spellData.id});
			  });
		  });
		
	  spells.sort((a, b) => {
		  if (a.lvl === b.lvl)
			return a.name
			.toUpperCase()
			.localeCompare(b.name.toUpperCase(), undefined, {
				sensitivity: "base",
			});
			return a.lvl - b.lvl;
	  });

		if(spells.length === 0) { return ui.notifications.info("You have no spells available or are out of focus points"); }

  await Levels();

  async function Levels() {
    buttons = {};
    let levels = [...new Set(spells.map(l => l.lvl))];
    levels.forEach((index,value)=> {
      console.log(index);
      if (index === 0) { index = 'Cantrip'}
      async function Filter(){
        if (index === 'Cantrip') { spells = spells.filter(c => c.spell.spell.isCantrip); }
        else{ spells = spells.filter(l => l.lvl === index); }
      }
      buttons[value] = {label: index, callback: async () => { await Filter(); console.log(spells); await Spell(); }}
    });
    await Diag({title: "Spell Level?", buttons});
  }

  async function Spell() {
    buttons = {};
    spells.forEach((value,index) => {
      console.log(value,index);
      if (value.lvl !== value.spell.spell.data.data.level.value && !value.spell.spell.data.isCantrip && !value.spell.spell.data.isFocusSpell) {
        if (value.spell.spell.data.data.heightenedLevel === undefined) { value.spell.spell.data.data.heightenedLevel = {value: value.lvl}; }
        else {value.spell.spell.data.data.heightenedLevel.value = value.lvl;}
      }
      async function Cast() { value.spell.spell.toMessage(); spells = value; console.log(spells);}
      async function Consume(){
        const s_entry = token.actor.itemTypes.spellcastingEntry.find(e => e.id === spells.sEId);
        console.log(s_entry);
        if (spells.type === 'spontaneous') {
          if ( spells.spell.spell.isCantrip ) { return; }
          let data = duplicate(s_entry.data);
          Object.entries(data.data.slots).forEach(slot => {
              if (parseInt(slot[0].substr(4)) === spells.lvl && slot[1].value > 0) { 
                slot[1].value-=1;
                s_entry.update(data);
              }
          })
        }
  
        /* Focus */
        if (spells.type === 'focus' && !spells.spell.spell.isCantrip && token.actor.data.data.resources.focus.value > 0) {
          const currentpoints = token.actor.data.data.resources.focus.value-1;
          token.actor.update({"data.resources.focus.value":currentpoints});
        }
        
        /* Prepared */
        if (spells.type === 'prepared') { 
          if ( spells.spell.spell.isCantrip ) { return; }
          let data = duplicate(s_entry.data);
          Object.entries(data.data.slots).forEach(slot => {
              if (slot[0] === `slot${spells.lvl}`) {
                slot[1].prepared[spells.index].expended = true;
                s_entry.update(data);
              }
          })
        }
      };
      buttons[index] = {label: value.name, callback: async () => {  await Cast(); await Consume(); }}
    });
    await Diag({title: "Pick a Spell to Cast", buttons});
  }
	async function Diag({title,buttons,content} = {}) {
		await new Promise(() => {
			new Dialog({
				title,
				buttons,
			}).render(true);
		});
	}
 }
}
  
let content = `
<style>
  .psya-buttons {
    margin: 0 auto;
  }

  .psya-buttons:hover {
    background-color:#44c767;
  }
</style>
<div><strong>Choose a Spellcasting Entry:</strong></div><script>${script}
</script>`;
token.actor.itemTypes.spellcastingEntry.forEach((value,index) => {
  const test = value.getSpellData();
  if (test.isFocusPool && !test.levels.some(x => x.isCantrip) && token.actor.data.data.resources.focus.value === 0){ return; }
  content = content + `<button name="button${index}" class="psya-buttons ${index}" type="button" value="${value.name}" onclick="Spells('${value.id}')">${value.name}</button>`
});  
await new Promise(async (resolve) => {
 await new Dialog({
    title:"Caster's Spellbook",
    content,
    buttons:{ Close: { label: "Close" } },
    }).render(true);
    setTimeout(resolve,1);
});

document.getElementsByClassName("app window-app dialog")[document.getElementsByClassName("app window-app dialog").length - 1].style.width = "200px";
document.getElementsByClassName("app window-app dialog")[document.getElementsByClassName("app window-app dialog").length - 1].style.resize = "both";
document.getElementsByClassName("app window-app dialog")[document.getElementsByClassName("app window-app dialog").length - 1].style.overflow = "auto";
