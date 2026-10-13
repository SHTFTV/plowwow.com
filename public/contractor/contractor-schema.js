export const equipmentTypes=['Hand-clearing crew','Snow blower','Snow pusher','Walkway salt spreader','Walkway brine sprayer','Pickup plow truck','Granular salting truck','Truck-mounted brine system','Skid steer / Bobcat','Loader / backhoe','Dump / snow-hauling truck','Other winter equipment'];
export function validateApplication(raw){
 const value={};
 const limits={business:100,name:100,email:255,phone:30,base:100,province:50,postalCode:7,website:200,areas:600,interest:70,response:40,availability:800,services:600,insuranceStatus:50,insurer:100,liabilityLimit:60,insuranceExpiry:10,autoCoverage:100,worksafeStatus:100,worksafeAccount:40,wcbProvince:50,coverageNotes:600,notes:800};
 for(const [k,n] of Object.entries(limits)){value[k]=String(raw[k]??'').trim();if(value[k].length>n)throw Error(k+' exceeds the permitted length.');}
 for(const k of ['business','name','email','phone','base','province','postalCode','areas','interest','response','availability','services','insuranceStatus','autoCoverage','worksafeStatus'])if(!value[k])throw Error('Complete the required '+k+' field.');
 if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.email))throw Error('Enter a valid email address.');
 if(!/^[0-9+\-()\s]{7,30}$/.test(value.phone))throw Error('Enter a valid phone number.');
 if(!/^[A-Za-z]\d[A-Za-z][ -]?\d[A-Za-z]\d$/.test(value.postalCode))throw Error('Enter a valid Canadian postal code.');
 value.operators=Number(raw.operators);if(!Number.isInteger(value.operators)||value.operators<1||value.operators>500)throw Error('Enter the available worker / operator count from 1 to 500.');
 if(raw.consent!==true)throw Error('Application review consent is required.');value.consent=true;
 if(value.insuranceStatus==='Current coverage'&&(!value.insurer||!value.liabilityLimit||!/^\d{4}-\d{2}-\d{2}$/.test(value.insuranceExpiry)))throw Error('Enter insurer, liability limit and expiry for current coverage.');
 if(!Array.isArray(raw.equipment)||!raw.equipment.length||raw.equipment.length>10)throw Error('Add between 1 and 10 equipment or crew entries.');
 const currentYear=new Date().getFullYear();
 value.equipment=raw.equipment.map((e,i)=>{
  const row={type:String(e.type??''),make:String(e.make??'').trim(),model:String(e.model??'').trim(),year:e.year===''||e.year==null?null:Number(e.year),quantity:Number(e.quantity),details:String(e.details??'').trim(),photoCount:Number(e.photoCount)};
  if(!equipmentTypes.includes(row.type))throw Error('Choose an equipment type for entry '+(i+1)+'.');
  if(row.make.length>80||row.model.length>80||row.details.length>400)throw Error('Equipment entry '+(i+1)+' has a field that is too long.');
  const hand=row.type==='Hand-clearing crew';
  if(!hand&&(!row.make||!row.model||!Number.isInteger(row.year)||row.year<1950||row.year>currentYear+1))throw Error('Enter make, model and year for equipment entry '+(i+1)+'.');
  if(hand&&!row.details)throw Error('Describe the tools and crew size for hand-clearing entry '+(i+1)+'.');
  if(!Number.isInteger(row.quantity)||row.quantity<1||row.quantity>100)throw Error('Enter quantity from 1 to 100 for entry '+(i+1)+'.');
  if(!Number.isInteger(row.photoCount)||row.photoCount<0||row.photoCount>3)throw Error('Attach up to 3 equipment photos to entry '+(i+1)+'.');
  return row;
 });
 return value;
}
