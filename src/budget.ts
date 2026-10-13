import { AsyncLocalStorage } from 'node:async_hooks';
import { ReaderError } from './errors.js';
const budgets=new AsyncLocalStorage<{deadline:number;requests:number}>();
export function withinBudget<T>(operation:()=>Promise<T>):Promise<T>{return budgets.run({deadline:Date.now()+60000,requests:0},operation);}
export function requestTimeout():number{
  const budget=budgets.getStore();if(!budget)return 20000;
  if(++budget.requests>100||budget.deadline<=Date.now())throw new ReaderError('OPERATION_LIMIT','Operation budget reached. Narrow the request or use a smaller page.');
  return Math.min(20000,budget.deadline-Date.now());
}
