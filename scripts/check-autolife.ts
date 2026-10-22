import {createSoloGame,waitingFor,advanceMonth,autoSubmit} from '../server/src/simulation/engine.js';
import {automaticHousehold} from '../server/src/simulation/automatic-household.js';
import {DEFAULT_GAME_CONFIG} from '../shared/src/index.js';
for(const country of ['ITA','CHN','EGY','NGA']){
const g=createSoloGame('audit','p','Alex',{...DEFAULT_GAME_CONFIG,countryMode:'fixed',fixedCountry:country,storyMode:true,monthlyMode:true,maxAge:85,autoDecisions:true},`audit-${country}`);
let n=0;
while(g.status==='playing'&&n++<1100){for(const slot of waitingFor(g))autoSubmit(g,slot);automaticHousehold(g);advanceMonth(g);}
const c=g.players[0]!.character!;console.log(country,c.age,c.finance.money,c.children,c.partnerName,c.business?.kind,c.manualActions?.filter(a=>a.action==='family-plan').length,c.usedDecisionIds.filter(id=>id==='crianza_dialogo'||id.startsWith('encuentro_')));
}
