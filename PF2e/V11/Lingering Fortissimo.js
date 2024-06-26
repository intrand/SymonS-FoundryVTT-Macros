/*
!!THIS MACRO DOES BOTH LINGERING COMPOSITION AND/OR FORTISSIMO COMPOSITION WHEN THE APPROPRIATE FEATS ARE PRESENT!!
To use this macro, you need to have the lingering composition feat on your character sheet or have Bard Dedication with the fortissimo composition feat.
To use fortissimo composition, you must have the fortissimo composition feat on your character sheet.
If you do not have lingering composition due to taking the bard dedication and skipping the feat, the checkbox will be permanently enabled and the spells will be filtered only to those that can be used by Fortissimo Composition.
This macro requires Workbench module. The macro will automatically use the effects in the workbench compendium.
*/

if(!game.modules.get("xdy-pf2e-workbench")?.active) { return ui.notifications.error("This Macro requires PF2e Workbench module")}
if (!actor || token.actor.type !== 'character') { return ui.notifications.warn("You must have a PC token selected"); }
if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition") && ( !token.actor.itemTypes.feat.some(s => s.slug === 'fortissimo-composition') && !token.actor.itemTypes.feat.some(s => s.slug === 'bard-dedication') ) ) { return ui.notifications.warn("The actor does not possess the Lingering Composition feat or does not have the Bard dedication with Lingering or Fortissimo Composition feats."); }
if (actor.system.resources.focus.value === 0 || actor.system.resources.focus.value === undefined) { return ui.notifications.warn("You have no focus points"); }

const modifiers = [];
const notes = [];
const skillName = "Performance";
const skillKey = "prf";
let actionSlug = "lingering-composition";
let actionName = "Lingering Composition";
const options = token.actor.getRollOptions(['all', 'skill-check', skillName.toLowerCase()]);
      
let cantrips = token.actor.itemTypes.spell.filter(s=> s.isFocusSpell === true && s.isCantrip === true && s.traits.has('composition') && s.system.duration.value === '1 round');

if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition")) { cantrips = cantrips.filter(s => ["rallying-anthem", "courageous-anthem", "song-of-strength"].includes(s.slug)) }   
      
const lc_data = [
	{ label: `Choose a Spell : `, type: `select`, options: cantrips.map(p=> p.name) },
	{ label: `Custom DC : `, type: `number`}
];

if (token.actor.itemTypes.feat.some(s => s.slug === 'fortissimo-composition')) {
	let options = `style="margin:auto;display:block"`
	if (!token.actor.itemTypes.feat.some(lc => lc.slug === "lingering-composition")) { options += ' checked disabled' }
	lc_data.push( { label: `Fortissimo Composition (Rallying Anthem, Courageous Anthem, and Song of Strength Only) : `, type: `checkbox`, options } ) 
}     

const {choice, event} = await quickDialog({data: lc_data, title: `Lingering Composition`});
      
const cast_spell = token.actor.itemTypes.spell.find(e => e.name === choice[0]);
const slug = cast_spell.slug;

let cs,suc;
const effectcom = game.packs.find(sp => sp.collection === "pf2e.spell-effects");
const effects = await effectcom.getIndex({fields:["system.slug"]});
let effect = effects.some(e => e.system.slug.includes(slug)) ? effects.find(e => e.system.slug.includes(slug)) : "";
if (choice[2]) {
	if (choice[0] === 'Courageous Anthem' || choice[0] === 'Rallying Anthem' || choice[0] === 'Song of Strength') {  
    	actionSlug = "fortissimo-composition";
    	actionName = "Fortissimo Composition";
		options.push(`action:${actionSlug}`);
		if (slug === "courageous-anthem") {
			cs = "Compendium.pf2e.spell-effects.Item.VFereWC1agrwgzPL";
			suc = "Compendium.pf2e.spell-effects.Item.kZ39XWJA3RBDTnqG";
		}
		if (slug === "rallying-anthem") {
			cs = "Compendium.pf2e.spell-effects.Item.BKam63zT98iWMJH7";
			suc = "Compendium.pf2e.spell-effects.Item.Chol7ExtoN2T36mP";
		}
		if (slug === "song-of-strength") {
			cs = "Compendium.pf2e.spell-effects.Item.8XaSpienzVXLmcfp";
			suc = "Compendium.pf2e.spell-effects.Item.Fjnm1l59KH5YJ7G9";
		}
		if (effect !== ''){
			notes.push({"outcome":["success"], "selector":"performance", "text":`<p>@UUID[${suc}]</p>`});
    		notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`<p>@UUID[${cs}]</p>`});
    		notes.push({"outcome":["failure","criticalFailure"], "selector":"performance", "text":`<p>@UUID[${effect.uuid}] You don't spend the Focus Point for casting the spell</p>`});
		}
	}
	else { 
		return void ui.notifications.warn('Fortissimo Composition is only applicable to Inspire Courage, Rallying Anthem, or Song of Strength');
	}
}
else {
	notes.push({"outcome":["success"], "selector":"performance", "text":`The composition lasts 3 rounds`});
    notes.push({"outcome":["criticalSuccess"], "selector":"performance", "text":`The composition lasts 4 rounds`});
	notes.push({"outcome":["failure","criticalFailure"], "selector":"performance", "text":`The composition lasts 1 round, but you don't spend the Focus Point for casting this spell`});
}
      
let DCbyLevel = [14,15,16,18,19,20,22,23,24,26,27,28,30,31,32,34,35,36,38,39,40,42,44,46,48,50]
      
let level;
let levels = [];
let willDCs = [];
const tokens = canvas.tokens.placeables.filter(t => token.distanceTo(t) <= 60 && !t.actor?.hasCondition("defeaned"));
if (choice[0] === 'Dirge of Doom') {
  options.push(`secret`)
  levels = tokens.filter(f => f.actor?.type === "npc" && !f.actor?.hasPlayerOwner && token.distanceTo(f) <= 30).map(l => l.actor.level);
  if (levels.length === 0) { return ui.notifications.warn('There are no enemies within range'); }
  else { level = Math.max(...levels); }
}
else { 
	levels = tokens.filter(pc => pc?.actor?.hasPlayerOwner && pc?.actor?.type === "character").map(l => l.actor.level);
    willDCs = tokens.filter(pc => pc?.actor?.hasPlayerOwner && pc?.actor?.type === "character").map(l => l.actor.saves.will.dc.value);
	level = Math.max(...levels);
}


if (level < 0) { level = 0 }      
let DC;
if ( isNaN(choice[1]) ) { 
	if (choice[2]) {
    DC = Math.max(...willDCs); 
  }
	else { DC = DCbyLevel[level]; }
}
else { DC = choice[1]; }
      
async function quickDialog({data, title = `Quick Dialog`} = {}) {
	data = data instanceof Array ? data : [data];
      
	return await new Promise(async (resolve) => {
	  let content = `
		<table style="width:100%">
		${data.map(({type, label, options, style}, i)=> {
			if(type.toLowerCase() === `select`) {
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><select id="${i}qd">${options.map((e,i)=> `<option value="${e}">${e}</option>`).join(``)}</td></tr>`;
			}
			else if(type.toLowerCase() === `checkbox`){
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" id="${i}qd" ${options || ``}/></td></tr>`;
			}
			else{
		  	return `<tr><th style="width:50%"><label>${label}</label></th><td style="width:50%"><input type="${type}" style="margin:auto;display:block;width:15%;text-align:center" id="${i}qd" value="${options instanceof Array ? options[0] : options} ${style || ""}"/></td></tr>`;
			}
		}).join(``)}
	  </table>`;
      
	  await new Dialog({
	    title, content,
	    buttons : {
		 		Ok : { label : `Ok`, callback : (html, event) => {
		   		resolve({choice:Array(data.length).fill().map((e,i)=>{
		     		let {type} = data[i];
		     		if(type.toLowerCase() === `select`) {
		       		return html.find(`select#${i}qd`).val();
		     		}
						else{
		       		switch(type.toLowerCase()) {
			 					case `text` :
			 					case `password` :
			 					case `radio` :
			 					return html.find(`input#${i}qd`)[0].value;
								case `checkbox` :
								return html.find(`input#${i}qd`)[0].checked;
								case `number` :
								return html.find(`input#${i}qd`)[0].valueAsNumber;
		      		}
		    		}
		  		}), event});
				}}
	    },
		default: "Ok",
	  },{width:"400"})._render(true);
	  document.getElementById("0qd").focus();
	});
}
let aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.KIPV1TiPCzlhuAzo")).toObject();
if ( effect.slug === "spell-effect-rallying-anthem" ) {
	aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.tcnjhVxyRchqjt71")).toObject();
}
if (choice[0] === "Dirge of Doom") {
  aura = (await fromUuid("Compendium.xdy-pf2e-workbench.xdy-pf2e-workbench-items.Item.wOcAf3pf04cTM4Uk")).toObject();
}
if (effect === "" && choice[0] !== "Dirge of Doom") {
	aura.system.rules[0] = {key: "Aura", radius: 60, slug:"is-aura-effect" }
}
else if (choice[0] !== "Dirge of Doom") { aura.system.rules[0].effects[0].uuid = effect.uuid; }
aura.system.duration.value = 1;
aura.system.duration.unit = "rounds"
aura.img = cast_spell.img;
aura.name = `Aura: ${actionName} (${choice[0]})`
aura.slug = `aura-${actionSlug}`
aura.system.rules[0].level = Math.ceil(actor.level/2);
aura.system.level.value = Math.ceil(actor.level/2);
if (cs !== undefined) {
	aura.img = "systems/pf2e/icons/spells/inspire-heroics.webp"
}

const roll = await game.pf2e.Check.roll(
	new game.pf2e.CheckModifier(
	  `<span class="pf2-icon">A</span> <b>${actionName}</b><br><i>${choice[0]}</i> - <p class="compact-text">${skillName } Skill Check</p>`,
	  token.actor.skills.performance, modifiers 
	), { actor: token.actor, type: 'skill-check', options, notes, dc: { value: DC }}, event);

if (roll.options.degreeOfSuccess === 3) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = cs;
	}
	else {
		aura.system.duration.value = 4
	}
}
if (roll.options.degreeOfSuccess === 2) {
	if(choice[2] && effect !== undefined) {
		aura.system.rules[0].effects[0].uuid = suc;
	}
	else {
		aura.system.duration.value = 3
	}
}
await token.actor.createEmbeddedDocuments("Item",[aura]);
if (roll.options.degreeOfSuccess > 1) { 
  const currentpoints = actor.system.resources.focus.value-1;
  await actor.update({"system.resources.focus.value":currentpoints});
}