import type {BusinessState,CharacterState} from "@life-duel/shared";
export function businesses(c:CharacterState):BusinessState[]{return [c.business,...(c.otherBusinesses??[])].filter((b):b is BusinessState=>!!b).filter((b,i,list)=>list.findIndex(x=>x.id===b.id)===i);}
export function activeBusinesses(c:CharacterState):BusinessState[]{return businesses(c).filter(b=>b.active);}
export function selectBusiness(c:CharacterState,id:string):boolean{
 const target=businesses(c).find(b=>b.id===id);if(!target)return false;
 c.otherBusinesses=businesses(c).filter(b=>b.id!==id);c.business=target;return true;
}
