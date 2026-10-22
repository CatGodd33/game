import type { PlayerSlot } from "@life-duel/shared";
import type { StoredGame } from "../types/records.js";
import { beginTurn, finalizeGame, setPaused } from "./engine.js";

/** One persisted room, two autonomous solo simulations. No turn barrier. */
export function initializeDuelRuns(room:StoredGame):void {
 room.independentRuns={};
 for(const player of room.players.filter(p=>!p.left)){
  const run:StoredGame={...structuredClone(room),independentRuns:undefined,mode:"solo",hostSlot:player.slot,code:null,
   players:[structuredClone(player)],pending:null,history:[],final:null,idempotency:{},
   config:{...room.config,storyMode:true,monthlyMode:true,autoDecisions:false,decisionTimerSeconds:0},
   clock:{...room.clock,autoDecisions:false,decisionTimerSeconds:0,paused:false,deadlineAt:null},autoVotes:{},
   world:{usedEventIds:[],lastEventAges:{},turnsSinceEvent:0},scoreHistory:[{age:0,players:{[player.slot]:player.score?.total??0}}]};
  run.players[0]!.character!.flags=[...new Set([...(run.players[0]!.character!.flags??[]),"duelo_infancia_protegida"])];
  beginTurn(run);setPaused(run,true);room.independentRuns[player.slot]=run;
 }
 room.pending=null;syncDuelRuns(room);
}
export function personalLife(room:StoredGame,playerId:string):StoredGame {
 const slot=room.players.find(p=>p.playerId===playerId)?.slot;
 return slot&&room.independentRuns?.[slot]||room;
}
export function syncDuelRuns(room:StoredGame):void {
 if(!room.independentRuns)return;
 for(const player of room.players){
  const run=room.independentRuns[player.slot],own=run?.players[0];if(!run||!own)continue;
  const {slot,playerId,alias,ready,left,joinedAt,lastSeenAt}=player;
  Object.assign(player,structuredClone(own),{slot,playerId,alias,ready,left,joinedAt,lastSeenAt});
 }
 const runs=Object.values(room.independentRuns).filter((r):r is StoredGame=>!!r);
 room.updatedAt=new Date(Math.max(Date.now(),Date.parse(room.updatedAt)+1)).toISOString();
 room.age=Math.max(0,...runs.map(r=>r.age));room.currentYear=room.birth.year+room.age;
 const history=new Map<number,StoredGame["history"][number]>();
 const scores=new Map<number,StoredGame["scoreHistory"][number]>();
 for(const run of runs){for(const turn of run.history){const existing=history.get(turn.age);if(existing)Object.assign(existing.players,structuredClone(turn.players));else history.set(turn.age,structuredClone(turn));}
  for(const point of run.scoreHistory){const existing=scores.get(point.age);if(existing)Object.assign(existing.players,point.players);else scores.set(point.age,structuredClone(point));}}
 room.history=[...history.values()].sort((a,b)=>a.age-b.age);room.scoreHistory=[...scores.values()].sort((a,b)=>a.age-b.age);
 if(runs.length===2&&runs.every(r=>r.status==="finished")){
  finalizeGame(room);
  for(const slot of [1,2] as PlayerSlot[]){const result=room.independentRuns[slot]?.final?.players[slot];if(result&&room.final)room.final.players[slot]=structuredClone(result);}
 }else{room.status="playing";room.pending=null;room.final=null;room.clock.deadlineAt=null;}
}
