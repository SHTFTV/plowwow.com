export const RATES = Object.freeze({walkPerFoot:0.15,lotPerSqFt:0.015,minimum:175,saltFraction:0.5,gst:0.05,version:'2026-10-21-beta'});
export const CITIES = ['Vancouver','Burnaby','Richmond','Coquitlam','Port Coquitlam','Port Moody','New Westminster','North Vancouver','West Vancouver','Surrey','Langley','Delta','White Rock','Maple Ridge','Pitt Meadows','Abbotsford','Mission','Chilliwack'];
export function calculate(input){
 const {walk,lot,snow,salt,units='metric',city}=input;
 if(!CITIES.includes(city))throw new Error('Choose a supported Lower Mainland municipality.');
 if(!['metric','imperial'].includes(units))throw new Error('Choose metres or feet.');
 if(![walk,lot,snow,salt].every(n=>typeof n==='number'&&Number.isFinite(n)))throw new Error('Enter finite numeric measurements and visit counts.');
 if(walk<0||lot<0||walk+lot<=0)throw new Error('Enter at least one clearing measurement greater than zero.');
 if(!Number.isInteger(snow)||!Number.isInteger(salt)||snow<0||snow>100||salt<0||salt>200||snow+salt===0)throw new Error('Use whole visit counts: 0–100 combined visits and 0–200 additional salt-only visits, with at least one visit.');
 const walkFt=units==='metric'?walk/0.3048:walk;
 const lotSqFt=units==='metric'?lot/0.09290304:lot;
 if(walkFt>10000/0.3048||lotSqFt>200000)throw new Error('This scope needs a property review. Call 604-761-1518.');
 const walkway=walkFt*RATES.walkPerFoot,openArea=lotSqFt*RATES.lotPerSqFt,measured=walkway+openArea;
 const combined=Math.max(RATES.minimum,measured),minimumAdjustment=combined-measured,saltOnly=combined*RATES.saltFraction;
 const season=combined*snow+saltOnly*salt;
 return {walkFt,lotSqFt,walkway,openArea,minimumAdjustment,combined,saltOnly,snow,salt,season,gst:season*RATES.gst,total:season*(1+RATES.gst),low:Math.floor(season*.75/100)*100,high:Math.ceil(season*1.25/100)*100,equivalents:snow+salt/2};
}
