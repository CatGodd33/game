import { countryProfile } from "./country-context.js";
import type { CharacterState, MonthlyStatement } from "@life-duel/shared";
import { adjustDebt,repayDebt } from "./economy.js";
const cents=(n:number)=>Math.round(n*100)/100;
export function monthlyInstallment(principal:number,annualRate:number,years:number):number {
 const r=annualRate/12,n=Math.max(1,years*12);
 return cents(r?principal*r/(1-(1+r)**-n):principal/n);
}
/** Named loans keep their agreed rate; legacy unassigned debt uses the game's 8% rate. */
export function settleDebtInterest(c:CharacterState,year:number):number {
 const loans=(c.loans??[]).filter(l=>l.active&&l.balance>0);
 const mortgages=(c.assets??[]).filter(a=>(a.loanBalance??0)>0);
 const tracked=loans.reduce((n,l)=>n+l.balance,0)+mortgages.reduce((n,a)=>n+a.loanBalance!,0);
 const scale=tracked>c.finance.debt?c.finance.debt/tracked:1;
 let interest=Math.max(0,c.finance.debt-tracked)*.08/12;
 for(const loan of loans){loan.balance=cents(loan.balance*scale);const due=cents(loan.balance*loan.annualInterestRate/12);loan.balance=cents(loan.balance+due);interest+=due;}
 for(const asset of mortgages){asset.loanBalance=cents(asset.loanBalance!*scale);const due=cents(asset.loanBalance*(asset.loanRate??.08)/12);asset.loanBalance=cents(asset.loanBalance+due);interest+=due;}
 interest=cents(interest);if(interest)adjustDebt(c,interest,"Intereses de préstamos y deuda",year);
 return interest;
}
export function settleMortgagePayments(c:CharacterState,year:number,m:MonthlyStatement):void {
 for(const asset of c.assets??[]){
  if(!(asset.loanBalance??0)||!asset.monthlyPayment)continue;
  const due=Math.min(asset.loanBalance!,asset.monthlyPayment);
  const paid=repayDebt(c,due,year,`Cuota hipotecaria · ${asset.name} · mes ${m.month}`);
  asset.loanBalance=cents(Math.max(0,asset.loanBalance!-paid));m.debtPayment+=paid;
  if(paid)m.items!.push({label:`Cuota hipotecaria · ${asset.name}`,amount:paid});
  if(paid+.01<due){asset.missedPayments=(asset.missedPayments??0)+1;if(c.credit)c.credit.score=Math.max(0,c.credit.score-1);m.note=`Cuota hipotecaria incompleta: faltan ${cents(due-paid)} PPP. La deuda pendiente continúa; no se vuelve a sumar como una factura nueva.`;}
  else asset.missedPayments=0;
 }
}

export function mortgageRate(c:CharacterState):number { return countryProfile(c.currentCountry).mortgageRatePct/100; }
