import {equipmentTypes,validateApplication} from './contractor-schema.js';
import {endpoint,publicKey} from './contractor-config.js';
const form=document.getElementById('contractor-application');
if(form){
 const startedAt=Date.now(),entries=document.getElementById('equipment-entries'),status=document.getElementById('application-status'),button=form.querySelector('button[type=submit]');
 let sequence=0,submission=null;const photos=new Map();
 const add=()=>{
  if(entries.children.length>=10){status.textContent='A maximum of 10 equipment / crew entries can be submitted.';return;}
  const id=++sequence,section=document.createElement('section');section.className='equipment-entry';section.dataset.entry=String(id);
  const f=(name,label,type='text',extra='')=>`<div class="apply-field"><label for="equipment-${id}-${name}">${label}</label><input id="equipment-${id}-${name}" data-field="${name}" type="${type}" ${extra}></div>`;
  section.innerHTML=`<h3>Equipment / crew entry ${id}</h3><div class="apply-grid"><div class="apply-field"><label for="equipment-${id}-type">Equipment / crew type *</label><select id="equipment-${id}-type" data-field="type" required><option value="">Choose a type</option>${equipmentTypes.map(t=>'<option>'+t+'</option>').join('')}</select></div>${f('quantity','How many identical units / crews? *','number','required min="1" max="100" step="1" value="1"')}${f('make','Make *','text','maxlength="80" required')}${f('model','Model *','text','maxlength="80" required')}${f('year','Model year *','number','required min="1950" max="'+(new Date().getFullYear()+1)+'" step="1"')}</div><div class="apply-field"><label for="equipment-${id}-details">Attachments, capacity, condition, tools or crew size</label><textarea id="equipment-${id}-details" data-field="details" maxlength="400" rows="3"></textarea></div><div class="apply-field"><label for="equipment-${id}-photos">Equipment photos — optional but preferred, up to 3 images</label><input id="equipment-${id}-photos" data-field="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple><small>JPG, PNG or WebP, up to 10 MB each. Photos are resized for upload and remain private with your application.</small></div><div class="equipment-previews" aria-label="Selected equipment photos"></div><button type="button" class="remove-equipment">Remove this entry</button>`;
  section.querySelector('[data-field=type]').addEventListener('change',e=>{const hand=e.target.value==='Hand-clearing crew';for(const k of ['make','model','year']){const input=section.querySelector('[data-field='+k+']');input.required=!hand;section.querySelector('label[for="'+input.id+'"]').textContent=({make:'Make',model:'Model',year:'Model year'}[k])+(hand?' (optional for hand crews)':' *');}section.querySelector('[data-field=details]').required=hand;});
  section.querySelector('.remove-equipment').addEventListener('click',()=>{section.remove();photos.delete(id);submission=null;});
  section.querySelector('[data-field=photos]').addEventListener('change',e=>{const files=[...e.target.files],preview=section.querySelector('.equipment-previews');preview.replaceChildren();photos.delete(id);submission=null;
   if(files.length>3||files.some(f=>!['image/jpeg','image/png','image/webp'].includes(f.type)||f.size>10*1024*1024)){e.target.setCustomValidity('Select up to 3 JPG, PNG or WebP images, each no larger than 10 MB.');e.target.reportValidity();return;}
   e.target.setCustomValidity('');photos.set(id,files);for(const file of files){const img=document.createElement('img'),url=URL.createObjectURL(file);img.src=url;img.alt='Selected equipment photo';img.onload=()=>URL.revokeObjectURL(url);preview.append(img);}
  });entries.append(section);submission=null;
 };
 document.getElementById('add-equipment').addEventListener('click',add);add();
 form.addEventListener('input',()=>{submission=null;});
 const prepare=async file=>{const image=await createImageBitmap(file),scale=Math.min(1,1200/Math.max(image.width,image.height)),canvas=document.createElement('canvas');canvas.width=Math.round(image.width*scale);canvas.height=Math.round(image.height*scale);canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.close();const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.8));if(!blob||blob.type!=='image/webp'||blob.size>1048576)throw Error('A photo could not be prepared. Select a smaller JPG, PNG or WebP image.');return blob;};
 const request=async payload=>{const r=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+publicKey,apikey:publicKey},body:JSON.stringify(payload)});const data=await r.json();if(!r.ok)throw Error(data.error||'Unable to save your application. Please try again.');return data;};
 form.addEventListener('submit',async e=>{e.preventDefault();if(button.disabled)return;
  if(!endpoint||!publicKey){status.textContent='Applications are not open yet. Please check back shortly.';return;}
  const rows=[...entries.children];let application;
  try{const data=Object.fromEntries(new FormData(form));data.consent=data.consent==='on';data.equipment=rows.map(row=>Object.fromEntries(['type','make','model','year','quantity','details'].map(k=>[k,row.querySelector('[data-field='+k+']').value]).concat([['photoCount',photos.get(Number(row.dataset.entry))?.length||0]])));application=validateApplication(data);}catch(err){status.textContent=err.message;return;}
  button.disabled=true;button.textContent='Saving application…';status.textContent='Preparing equipment photos. Keep this page open.';
  try{
   const images=await Promise.all(rows.map(async row=>Promise.all((photos.get(Number(row.dataset.entry))||[]).map(prepare))));
   if(!submission)submission=await request({action:'start',application,hp:form.company_url.value,startedAt});
   let complete=0;for(const upload of submission.uploads){status.textContent='Uploading equipment photo '+(++complete)+' of '+submission.uploads.length+'…';const r=await fetch(upload.url,{method:'PUT',headers:{'Content-Type':'image/webp'},body:images[upload.entry][upload.photo]});if(!r.ok){const body=await r.json().catch(()=>({}));if(!/already exists|duplicate/i.test(body.message||body.error||''))throw Error('A photo upload failed. Your details remain here. Please retry.');}}
   const result=await request({action:'finish',id:submission.id,token:submission.token});if(result.success!==true||!result.id)throw Error('Submission could not be confirmed.');
   status.textContent='Application submitted. Reference: '+result.id+'. Your equipment details and photos are saved for PlowWow review. This does not approve work or guarantee assignments.';
   form.reset();photos.clear();entries.replaceChildren();submission=null;add();
  }catch(err){status.textContent=err.message||'We could not confirm submission. Keep your details here and try again.';}
  finally{button.disabled=false;button.textContent='Send contractor application';}
 });
}
