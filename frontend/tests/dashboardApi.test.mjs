import test from 'node:test';
import assert from 'node:assert/strict';
import { createDashboardApi, dashboardMoney, parseDashboard } from '../src/dashboard/api.ts';
const fixture = () => [
  {month:'2026-11',currencies:[{currency:'RUB',monthlyEquivalent:120,actualCharges:240},{currency:'USD',monthlyEquivalent:10,actualCharges:10}]},
  {month:'2026-11',currencies:[{currency:'RUB',totalAmount:240,categories:[{categoryId:1,categoryName:'Кино',amount:240,percentage:100,other:false}]},{currency:'USD',totalAmount:10,categories:[{categoryId:null,categoryName:'Другое',amount:10,percentage:100,other:true}]}]},
  {totalCount:2,payments:[{subscriptionId:1,subscriptionName:'Ruble',categoryName:'Кино',amount:120,currency:'RUB',paymentDate:'2026-11-20'},{subscriptionId:2,subscriptionName:'Dollar',categoryName:'Кино',amount:10,currency:'USD',paymentDate:'2026-11-21'}],totals:[{currency:'RUB',amount:120},{currency:'USD',amount:10}]},
];
test('backend aggregates stay independent and currencies are never added or relabelled',()=>{
  const source=fixture(); const rub=parseDashboard(...source,'2026-11','RUB'); const usd=parseDashboard(...source,'2026-11','USD');
  assert.equal(rub.stats.monthlyEquivalentMinor,12000); assert.equal(rub.stats.scheduledChargesMinor,24000);
  assert.equal(rub.data.totalMinor,24000); assert.equal(rub.data.upcoming.length,1);
  assert.equal(usd.stats.currency,'USD'); assert.equal(usd.stats.monthlyEquivalentMinor,1000);
  assert.equal(usd.data.categories[0].other,true); assert.equal(usd.data.upcoming[0].name,'Dollar');
  assert.equal(rub.data.subscriptionCount,undefined);
});
test('empty replies are actual zeros, not malformed-data fallback',()=>{
  const result=parseDashboard({month:'2026-11',currencies:[]},{month:'2026-11',currencies:[]},{payments:[],totalCount:0,totals:[]},'2026-11','RUB');
  assert.equal(result.stats.scheduledChargesMinor,0); assert.deepEqual(result.data.upcoming,[]);
  assert.throws(()=>parseDashboard({}, {}, {}, '2026-11','RUB'));
});
test('decimal server amounts become integer minor units without fractional precision loss',()=>{
  assert.equal(dashboardMoney(0.29),29); assert.equal(dashboardMoney('12.05'),1205);
  for(const v of [-1,0.001,NaN,Infinity,null,{},'1e3','999999999999999999']) assert.throws(()=>dashboardMoney(v));
});
test('mismatched months, totals, duplicated IDs, unsupported currencies and impossible dates fail closed',()=>{
  for(const change of [f=>f[0].month='2026-10',f=>f[1].currencies[0].categories[0].amount=239,f=>f[2].totalCount=3,f=>f[2].payments[0].paymentDate='2026-02-30',f=>f[2].payments[1].subscriptionId=1,f=>f[0].currencies[0].currency='GBP',f=>f[2].totals[0].amount=121]){
    const f=fixture();change(f);assert.throws(()=>parseDashboard(...f,'2026-11','RUB'));
  }
});
test('API uses three authenticated endpoints and a complete untruncated upcoming list',async()=>{
  const calls=[];const signal=new AbortController().signal;const f=fixture();
  const request=async(url,options)=>{calls.push({url,options}); return new Response(JSON.stringify(f[url.includes('/summary')?0:url.includes('/categories')?1:2]));};
  const result=await createDashboardApi('/api',request).load('test-token','2026-11','RUB',signal);
  assert.equal(result.stats.scheduledChargesMinor,24000);
  assert.deepEqual(calls.map(c=>c.url),['/api/dashboard/summary?month=2026-11','/api/dashboard/categories?month=2026-11','/api/dashboard/upcoming']);
  assert.ok(calls.every(c=>c.options.headers.Authorization==='Bearer test-token' && c.options.signal));
});
test('401, 403, server errors and cancellation never return demo data',async()=>{
  for(const status of [401,403,500]) await assert.rejects(createDashboardApi('/api',async()=>new Response('private details',{status})).load('test-token','2026-11','RUB'),e=>e.status===status && !e.message.includes('private details'));
  const c=new AbortController();c.abort();let calls=0;
  await assert.rejects(createDashboardApi('/api',async()=>{calls++;return new Response('{}');}).load('test-token','2026-11','RUB',c.signal),{name:'AbortError'}); assert.equal(calls,0);
});
