/* Browser-local schedule editor. All exported pixels are drawn directly at output resolution. */
(() => {
'use strict';
const $=id=>document.getElementById(id), KEY='tcg.schedule-maker.v1', MAX=4096;
const PRESETS=[['list','상세 목록 · 1600 × 2400',1600,2400],['wide','가로 와이드 · 3840 × 2160',3840,2160],['portrait','세로 대형 · 2100 × 2970',2100,2970],['square','큰 정사각형 · 2160 × 2160',2160,2160],['feed','세로 공지 · 1080 × 1350',1080,1350],['story','긴 세로 · 1080 × 1920',1080,1920],['landscape','가로 공지 · 1920 × 1080',1920,1080],['custom','직접 입력',0,0]];
PRESETS.unshift(['weekwide','주간 가로 기본 · 2800 × 1600',2800,1600]);
const today=new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());
const defaultMonth=today.slice(0,7), uid=()=>globalThis.crypto?.randomUUID?.()||`${Date.now()}-${Math.random()}`;
let state={version:1,design:'list',layout:'list',title:'TCG 대회 일정',from:defaultMonth+'-01',to:endMonth(defaultMonth),preset:'list',width:1600,height:2400,autoHeight:true,scale:1,textColor:'#ffffff',fontWeight:'normal',cardColor:'#ffffff',cardScale:1,cardWeight:'normal',titleScale:1,periodScale:1,imgScale:1,bgColor:'#172334',cardBg:'#22344b',bandBg:'#f08c00',bandColor:'#ffffff',bgImage:'',bgOverlay:.7,bgScale:100,bgX:50,bgY:50,footer:'',events:[]};
const DEFAULTS=JSON.parse(JSON.stringify(state));
let fw=null, metrics=null, timer, storageOK=true, bgImg=null;
function endMonth(m){const [y,n]=m.split('-').map(Number);return `${m}-${String(new Date(y,n,0).getDate()).padStart(2,'0')}`;}
function validDate(v){if(!/^\d{4}-\d{2}-\d{2}$/.test(v))return false;const [y,m,d]=v.split('-').map(Number),dt=new Date(y,m-1,d);return y>=1900&&y<=2200&&dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d;}
function validMonth(v){return /^\d{4}-(0[1-9]|1[0-2])$/.test(v)&&validDate(v+'-01');}
function weekday(d){return '일월화수목금토'[new Date(d+'T12:00:00').getDay()];}
function addDays(value,count){const d=new Date(value+'T12:00:00');d.setDate(d.getDate()+count);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;}
function wdIdx(d){return new Date(d+'T12:00:00').getDay();}
function dayNum(d){return Math.round(new Date(d+'T12:00:00')/864e5);}
function firstOn(from,wd){return addDays(from,(wd-wdIdx(from)+7)%7);}
function resolveDate(e,from=state.from){if(e.weekday===undefined||!validDate(from))return e;e.date=addDays(firstOn(from,e.weekday),e.week*7);return e;}
function relFromDate(e,from=state.from){if(!validDate(e.date)||!validDate(from))return e;e.weekday=wdIdx(e.date);e.week=Math.round((dayNum(e.date)-dayNum(firstOn(from,e.weekday)))/7);return e;}
function resolve(){state.events.forEach(e=>resolveDate(e));}
function weekly(){return state.layout!=='list';}
function syncWeek(){if(weekly()&&validDate(state.from))state.to=addDays(state.from,6);}
function sample(m){return [3,7,7,10,14,14,15,20,21,21,27,28,28,29].map((day,i)=>({id:uid(),date:`${m}-${String(day).padStart(2,'0')}`,time:['13:00','15:00','18:00'][i%3],game:['니벨아레나','명조','포켓몬'][i%3],name:i%4===0?'매장 정기 대회':'',venue:'',fee:'',capacity:''})).filter(e=>validDate(e.date));}
function pct(v){const n=Math.round(Number(v)*20)/20;return n>=.5&&n<=2?n:1;}
function sanitize(data){
 if(!data||data.version!==1||!Array.isArray(data.events)||data.events.length>150)throw Error('버전 1의 일정 편집 파일만 열 수 있습니다. 일정은 최대 150개입니다.');
 const s={...state};for(const k of ['title','footer'])s[k]=String(data[k]??'').slice(0,k==='footer'?300:150);
 if(!validDate(data.from)||!validDate(data.to))throw Error('날짜가 올바르지 않습니다.');
 s.design='list';s.from=data.from;s.to=data.to;
 s.layout=['list','week-horizontal','week-vertical'].includes(data.layout)?data.layout:'list';
 if(s.layout!=='list')s.to=addDays(s.from,6);
 if(data.design==='calendar'&&validMonth(data.month)){s.from=data.month+'-01';s.to=endMonth(data.month);}
 for(const k of ['width','height']){if(!Number.isInteger(data[k])||data[k]<800||data[k]>MAX)throw Error('출력 크기는 800~4096px의 정수여야 합니다.');s[k]=data[k];}
 s.scale=pct(data.scale);
 s.autoHeight=!!data.autoHeight;s.textColor=/^#[0-9a-f]{6}$/i.test(data.textColor)?data.textColor:'#1b2c48';s.fontWeight=data.fontWeight==='bold'?'bold':'normal';s.cardColor=/^#[0-9a-f]{6}$/i.test(data.cardColor)?data.cardColor:'#1b2c48';s.cardWeight=data.cardWeight==='bold'?'bold':'normal';s.cardScale=pct(data.cardScale);s.titleScale=pct(data.titleScale);s.bgColor=/^#[0-9a-f]{6}$/i.test(data.bgColor)?data.bgColor:'#ffffff';s.cardBg=/^#[0-9a-f]{6}$/i.test(data.cardBg)?data.cardBg:'#f3f6fa';s.periodScale=pct(data.periodScale);s.imgScale=pct(data.imgScale);s.bgOverlay=Number.isFinite(Number(data.bgOverlay))?Math.min(.95,Math.max(0,Number(data.bgOverlay))):.7;s.bandBg=/^#[0-9a-f]{6}$/i.test(data.bandBg)?data.bandBg:'#1b2c48';s.bandColor=/^#[0-9a-f]{6}$/i.test(data.bandColor)?data.bandColor:'#ffffff';const nb=(v,lo,hi,d)=>Number.isFinite(Number(v))?Math.min(hi,Math.max(lo,Number(v))):d;s.bgScale=nb(data.bgScale,50,300,100);s.bgX=nb(data.bgX,0,100,50);s.bgY=nb(data.bgY,0,100,50);s.bgImage=typeof data.bgImage==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(data.bgImage)&&data.bgImage.length<=4e6?data.bgImage:'';
 s.preset=PRESETS.some(p=>p[0]===data.preset)?data.preset:'custom';
 s.events=data.events.map(e=>{const rel=Number.isInteger(e.weekday)&&e.weekday>=0&&e.weekday<=6&&Number.isInteger(e.week)&&Math.abs(e.week)<=520;if((!rel&&!validDate(e.date))||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)||!String(e.game||'').trim())throw Error('일정의 날짜, 시간, 게임명을 확인해 주세요.');const x={id:uid()};for(const k of ['time','game','name','venue','fee','capacity'])x[k]=String(e[k]??'').slice(0,150);x.image=typeof e.image==='string'&&/^data:image\/(jpeg|png|webp);base64,/.test(e.image)&&e.image.length<=500000?e.image:'';if(rel){x.weekday=e.weekday;x.week=e.week;}else{x.date=e.date;relFromDate(x,s.from);}resolveDate(x,s.from);return x;});return s;
}
try{const raw=localStorage.getItem(KEY);if(raw)state=sanitize(JSON.parse(raw));else state.events=sample(state.from.slice(0,7));}catch{state.events=sample(state.from.slice(0,7));storageOK=false;}
state.events.forEach(e=>{if(e.weekday===undefined)relFromDate(e);});resolve();
const controls=['layout','title','from','to','preset','width','height','autoHeight','scale','textColor','fontWeight','cardColor','cardScale','cardWeight','titleScale','periodScale','imgScale','bgColor','cardBg','bandBg','bandColor','bgOverlay','bgScale','bgX','bgY','footer'];
for(const p of PRESETS){const o=document.createElement('option');o.value=p[0];o.textContent=p[1];$('preset').append(o);}
function bgStatus(name){$('bgState').textContent=state.bgImage?`배경 이미지 적용 중${name?' · '+name:''}`:'배경 이미지가 없습니다.';}
function sync(){syncWeek();resolve();bgStatus();for(const k of controls){if(typeof state[k]==='boolean')$(k).checked=state[k];else $(k).value=['scale','cardScale','titleScale','periodScale','imgScale'].includes(k)?Math.round(state[k]*100):state[k];}$('to').disabled=weekly();$('weekHint').hidden=!weekly();$('previewTitle').textContent={'list':'일정 목록','week-horizontal':'주간 일정 · 가로형','week-vertical':'주간 일정 · 세로형'}[state.layout];$('sizeHint').textContent=state.layout==='week-horizontal'?'7일을 나란히 표시합니다. 시간과 게임명을 읽기 쉽도록 가로 2800px 이상을 권장합니다.':'기본 1600×2400px. 가로형·세로형·정사각형을 선택하거나 크기를 직접 입력할 수 있습니다.';}
const BKEY='tcg.schedule-maker.backup';
function backupText(){let t=null;try{t=localStorage.getItem(BKEY);}catch{}if(!t)return' 아직 편집 파일로 백업한 적이 없습니다.';const d=Math.floor((Date.now()-Number(t))/864e5);return d<1?' 마지막 파일 백업: 오늘':` 마지막 파일 백업: ${d}일 전${d>=7?' (백업을 권장합니다)':''}`;}
function persist(){storageOK=false;for(const v of [state,{...state,bgImage:''},{...state,bgImage:'',events:state.events.map(e=>({...e,image:''}))}]){try{localStorage.setItem(KEY,JSON.stringify(v));storageOK=true;break;}catch{}}$('saveState').textContent=storageOK?'입력 내용은 이 브라우저에 자동 저장됩니다. 다른 기기에서는 편집 파일을 열어 주세요.'+backupText():'자동 저장을 사용할 수 없습니다. 편집 파일 저장으로 내용을 보관해 주세요.';}
function label(e){const w=[];if(validDate(e.date)&&(e.date<state.from||e.date>state.to))w.push('기간 밖');if(state.events.some(o=>o!==e&&o.date===e.date&&o.time===e.time))w.push('시간 중복');return `${e.date.slice(5)}(${weekday(e.date)}) ${e.time} · ${e.game||'게임명 입력'}${w.length?' ⚠ '+w.join('·'):''}`;}
function refreshSummaries(){$('eventCount').textContent=`${state.events.length}/150개`;for(const box of document.querySelectorAll('#events .event')){const e=state.events.find(x=>x.id===box.dataset.id);if(e){box.querySelector('.event-title').textContent=label(e);box.querySelector('.date-hint').textContent=`→ ${e.date} (${weekday(e.date)})`;}}}
function update(){clearTimeout(timer);timer=setTimeout(()=>{refreshSummaries();render();persist();},100);}
function editor(){
 const root=$('events');root.replaceChildren();$('eventCount').textContent=`${state.events.length}/150개`;
 for(const e of state.events){const box=document.createElement('div');box.className='event';box.dataset.id=e.id;const head=document.createElement('div');head.className='event-head';const summary=document.createElement('span');summary.className='event-title';summary.textContent=label(e);head.append(summary);for(const [action,text] of [['edit','수정'],['remove','삭제']]){const b=document.createElement('button');b.type='button';b.dataset.action=action;b.className=action==='remove'?'remove':'secondary';b.textContent=text;head.append(b);}box.append(head);const fields=document.createElement('div');fields.className='event-fields';fields.hidden=true;
  for(const group of [[['weekday','요일','select'],['week','몇 번째 주 (시작일 기준)','number']],[['time','시간','time']],[['game','게임 종목','text']],[['name','대회명 (선택)','text']],[['venue','장소 (선택)','text']],[['fee','참가비 (선택)','text'],['capacity','정원 (선택)','text']]]){const row=document.createElement('div');if(group.length===2)row.className='two';for(const [k,label,type] of group){const wrap=document.createElement('div'),l=document.createElement('label'),input=document.createElement(type==='select'?'select':'input');input.id=`event-${e.id}-${k}`;l.htmlFor=input.id;l.textContent=label;if(type==='select'){[...'일월화수목금토'].forEach((n,i)=>{const o=document.createElement('option');o.value=i;o.textContent=n+'요일';input.append(o);});input.value=e.weekday;}else{input.type=type;input.value=k==='week'?e.week+1:e[k];if(k==='week')input.min=1;}input.dataset.field=k;input.maxLength=150;if(k==='game')input.setAttribute('list','games');wrap.append(l,input);row.append(wrap);}fields.append(row);if(group[0][0]==='weekday'){const h=document.createElement('p');h.className='hint date-hint';h.textContent=`→ ${e.date} (${weekday(e.date)})`;fields.append(h);}}
  {const ig=document.createElement('div'),il=document.createElement('label'),ii=document.createElement('input'),st=document.createElement('p'),rb=document.createElement('button');il.textContent='일정 이미지 (선택)';ii.type='file';ii.accept='image/*';ii.dataset.imgfile='1';ii.id=`event-${e.id}-image`;il.htmlFor=ii.id;st.className='hint img-state';st.textContent=e.image?'이미지가 등록되어 있습니다.':'등록된 이미지가 없습니다.';rb.type='button';rb.dataset.action='removeImg';rb.className='secondary';rb.textContent='이미지 제거';ig.append(il,ii,st,rb);fields.append(ig);}
  box.append(fields);root.append(box);
 }
}
$('events').addEventListener('input',ev=>{const field=ev.target.dataset.field;if(!field)return;const box=ev.target.closest('.event'),e=state.events.find(x=>x.id===box.dataset.id);if(field==='weekday'){e.weekday=Number(ev.target.value);resolveDate(e);}else if(field==='week'){const n=Number(ev.target.value);if(ev.target.value===''||!Number.isInteger(n))return;e.week=n-1;resolveDate(e);}else e[field]=ev.target.value;update();});
$('events').addEventListener('change',ev=>{if(!ev.target.dataset.imgfile)return;const f=ev.target.files[0];ev.target.value='';if(!f)return;if(!f.type.startsWith('image/'))return alert('이미지 파일을 선택해 주세요.');const box=ev.target.closest('.event'),e=state.events.find(x=>x.id===box.dataset.id),url=URL.createObjectURL(f),img=new Image();img.onload=()=>{const r=Math.min(1,800/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(img.width*r));c.height=Math.max(1,Math.round(img.height*r));c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);let d=c.toDataURL('image/webp',.85);if(d.startsWith('data:image/png')&&d.length>400000)d=c.toDataURL('image/jpeg',.8);if(!state.events.includes(e))return;e.image=d;box.querySelector('.img-state').textContent='이미지가 등록되어 있습니다.';update();};img.onerror=()=>{URL.revokeObjectURL(url);alert('이미지를 불러올 수 없습니다.');};img.src=url;});
let removed=null,undoTimer;
function showUndo(){$('undoBar').hidden=false;clearTimeout(undoTimer);undoTimer=setTimeout(()=>{$('undoBar').hidden=true;removed=null;},8000);}
$('undo').onclick=()=>{if(!removed)return;state.events.splice(removed.index,0,removed.e);removed=null;$('undoBar').hidden=true;editor();update();};
$('events').addEventListener('click',ev=>{const action=ev.target.dataset.action;if(!action)return;const id=ev.target.closest('.event').dataset.id,index=state.events.findIndex(e=>e.id===id);if(action==='remove'){removed={e:state.events[index],index};state.events.splice(index,1);showUndo();}else if(action==='removeImg'){const e=state.events[index];e.image='';ev.target.closest('.event').querySelector('.img-state').textContent='등록된 이미지가 없습니다.';update();return;}else{const box=ev.target.closest('.event'),f=box.querySelector('.event-fields');f.hidden=!f.hidden;ev.target.textContent=f.hidden?'수정':'닫기';return;}editor();update();});
for(const k of controls)$(k).addEventListener('input',()=>{if(['scale','cardScale','titleScale','periodScale','imgScale'].includes(k)){const v=Number($(k).value);if(!$(k).value||!(v>=50&&v<=200))return;state[k]=Math.round(v/5)*5/100;update();return;}state[k]=k==='autoHeight'?$(k).checked:['width','height','scale','cardScale','bgOverlay','bgScale','bgX','bgY'].includes(k)?Number($(k).value):$(k).value;if(k==='layout')state.preset=state.layout==='week-horizontal'?'weekwide':'list';if(k==='preset'||k==='layout'){const p=PRESETS.find(p=>p[0]===state.preset);if(p[2]){state.width=p[2];state.height=p[3];}}if(['width','height'].includes(k))state.preset='custom';if(['preset','width','height','layout','from'].includes(k))sync();update();});
function template(){const last=state.events.reduce((m,e)=>!m||(e.date+e.time)>=(m.date+m.time)?e:m,null);return last?{...last,id:uid(),fee:'',capacity:'',image:''}:{id:uid(),date:state.from,weekday:wdIdx(state.from),week:0,time:'13:00',game:'니벨아레나',name:'',venue:'',fee:'',capacity:''};}
$('add').onclick=()=>{if(state.events.length>=150)return alert('일정은 최대 150개까지 입력할 수 있습니다.');const e=template();if(state.events.length&&!weekly()){e.week+=1;resolveDate(e);}state.events.unshift(e);editor();{const box=$('events').firstElementChild;box.querySelector('.event-fields').hidden=false;box.querySelector('[data-action=edit]').textContent='닫기';box.scrollIntoView({block:'nearest'});}update();};
$('sample').onclick=()=>{if(!validDate(state.from))return alert('시작일을 먼저 입력해 주세요.');if(!confirm('현재 일정과 모든 출력 설정(색상, 글자, 배경 등)을 예시와 기본값으로 바꿀까요?'))return;{const keep={layout:state.layout,from:state.from,to:state.to};Object.assign(state,JSON.parse(JSON.stringify(DEFAULTS)),keep);const pr=PRESETS.find(p=>p[0]===(state.layout==='week-horizontal'?'weekwide':'list'));state.preset=pr[0];state.width=pr[2];state.height=pr[3];loadBg();}const month=state.from.slice(0,7);if(weekly()){state.events=sample(month).slice(0,9).map((e,i)=>({...e,date:addDays(state.from,[0,1,2,3,4,5,5,6,6][i])}));}else{state.events=sample(month);state.from=month+'-01';state.to=endMonth(month);}state.events.forEach(e=>relFromDate(e));sync();editor();update();};
$('actualSize').onclick=()=>{const cw=Math.min($('canvas').width+20,screen.availWidth-40),ch=Math.min($('canvas').height+40,screen.availHeight-80),w=window.open('','_blank',`popup=yes,width=${cw},height=${ch},left=20,top=20,resizable=yes,scrollbars=yes`);if(!w)return alert('팝업이 차단되었습니다. 이 사이트의 팝업을 허용해 주세요.');w.document.write('<!doctype html><meta charset="utf-8"><title>실제 픽셀 크기</title><body style="margin:0;background:#333;color:#fff;font:14px sans-serif;padding:20px">이미지를 만드는 중...</body>');w.document.close();$('canvas').toBlob(blob=>{if(!blob||w.closed)return;const url=URL.createObjectURL(blob);w.document.body.style.padding='0';w.document.body.replaceChildren();w.document.title=`실제 픽셀 크기 · ${$('canvas').width} × ${$('canvas').height}px`;const img=w.document.createElement('img');img.src=url;img.style.display='block';w.document.body.append(img);setTimeout(()=>URL.revokeObjectURL(url),600000);},'image/png');};
function download(blob,name){const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);}
$('saveProject').onclick=()=>{download(new Blob([JSON.stringify(state,null,2)],{type:'application/json'}),`tcg-schedule_${new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Seoul'}).format(new Date())}.json`);try{localStorage.setItem(BKEY,String(Date.now()));}catch{}persist();};
$('loadProject').onclick=()=>$('projectFile').click();
$('projectFile').onchange=async()=>{const f=$('projectFile').files[0];if(!f)return;try{if(f.size>6000000)throw Error('편집 파일이 너무 큽니다.');const next=sanitize(JSON.parse(await f.text()));if(state.events.length&&!confirm('현재 편집 내용을 선택한 파일로 바꿀까요?'))return;state=next;loadBg();sync();editor();render();persist();}catch(e){alert('파일을 열 수 없습니다: '+e.message);}finally{$('projectFile').value='';}};
$('download').onclick=async()=>{await document.fonts.ready;render();if(!metrics?.ok)return;const button=$('download');button.disabled=true;try{const blob=await new Promise(resolve=>$('canvas').toBlob(resolve,'image/png'));if(!blob)throw Error('이미지 생성에 실패했습니다. 출력 크기를 줄여 주세요.');download(blob,`${(state.title||'TCG').replace(/[\\/:*?"<>|\s]+/g,'_')}_${state.from}.png`);}catch(e){$('status').textContent=e.message;}finally{button.disabled=!metrics?.ok;}};
$('copy').onclick=async()=>{await document.fonts.ready;render();if(!metrics?.ok)return;try{const blob=await new Promise(r=>$('canvas').toBlob(r,'image/png'));await navigator.clipboard.write([new ClipboardItem({'image/png':blob})]);$('status').textContent='이미지를 클립보드에 복사했습니다.';}catch{$('status').textContent='이 브라우저에서는 복사를 지원하지 않습니다. PNG 저장을 이용해 주세요.';}};
const ctx=$('canvas').getContext('2d');
function font(n,bold=false){ctx.font=`${bold||(fw||state.fontWeight)==='bold'?700:500} ${n}px "Malgun Gothic", "Noto Sans KR", sans-serif`;}
function lines(text,width,size,bold=false){font(size,bold);const out=[];for(const paragraph of String(text).split('\n')){let line='';for(const char of paragraph){if(line&&ctx.measureText(line+char).width>width){out.push(line.trimEnd());line=char.trimStart();}else line+=char;}out.push(line);}return out;}
function text(block,x,y,size,color,bold=false){font(size,bold);ctx.fillStyle=color;ctx.textBaseline='top';for(let i=0;i<block.length;i++)ctx.fillText(block[i],x,y+i*size*1.36);}
function rect(x,y,w,h,color){ctx.fillStyle=color;ctx.fillRect(x,y,w,h);}
function wrapped(t,x,y,w,size,color,bold=false){const l=lines(t,w,size,bold);text(l,x,y,size,color,bold);return l.length*size*1.36;}
function rgba(hex,a){const n=parseInt(hex.slice(1),16);return `rgba(${n>>16},${(n>>8)&255},${n&255},${a})`;}
function loadBg(){if(!state.bgImage){bgImg=null;return;}const img=new Image();img.onload=()=>{bgImg=img;render();};img.onerror=()=>{bgImg=null;};img.src=state.bgImage;}
$('bgFile').onchange=()=>{const f=$('bgFile').files[0];$('bgFile').value='';if(!f)return;if(!f.type.startsWith('image/'))return alert('이미지 파일을 선택해 주세요.');const url=URL.createObjectURL(f),img=new Image();img.onload=()=>{const r=Math.min(1,1920/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*r);c.height=Math.round(img.height*r);const g=c.getContext('2d');g.fillStyle='#fff';g.fillRect(0,0,c.width,c.height);g.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);state.bgImage=c.toDataURL('image/jpeg',.8);loadBg();bgStatus(f.name);persist();};img.onerror=()=>{URL.revokeObjectURL(url);alert('이미지를 불러올 수 없습니다.');};img.src=url;};
$('bgClear').onclick=()=>{state.bgImage='';bgImg=null;bgStatus();render();persist();};
const imgCache=new Map();
function imgOf(e){let c=imgCache.get(e.id);if(!c||c.src!==e.image){c=new Image();c.onload=()=>render();c.src=e.image;imgCache.set(e.id,c);}return c.complete&&c.naturalWidth?c:null;}
function drawThumb(item,x,top,cardW,f,horizontal){if(!item.e.image)return;const im=imgOf(item.e);if(!im)return;const pw=item.pw,ph=item.ph,px=horizontal?x+f*.5:x+cardW-f*.5-pw,py=horizontal?top+f*.5:top+(item.h-ph)/2;ctx.fillStyle='rgba(128,128,128,.18)';ctx.fillRect(px,py,pw,ph);const r=Math.min(pw/im.naturalWidth,ph/im.naturalHeight),w=im.naturalWidth*r,h=im.naturalHeight*r;ctx.drawImage(im,px+(pw-w)/2,py+(ph-h)/2,w,h);}
function render(){
 fw=null;
 try{
 if(!Number.isInteger(state.width)||!Number.isInteger(state.height)||state.width<800||state.height<800||state.width>MAX||state.height>MAX)throw Error('가로와 세로를 800~4096px의 정수로 입력해 주세요.');
 if(!validDate(state.from)||!validDate(state.to)||state.from>state.to)throw Error('표시할 날짜 범위를 확인해 주세요.');
 const invalid=state.events.filter(e=>!validDate(e.date)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(e.time)||!e.game.trim());if(invalid.length)throw Error(`${invalid.length}개 일정의 날짜·시간·게임명을 입력해 주세요.`);
 const selected=state.events.filter(e=>e.date>=state.from&&e.date<=state.to).sort((a,b)=>a.date.localeCompare(b.date)||a.time.localeCompare(b.time));
 const horizontal=state.layout==='week-horizontal',week=weekly();
 const W=state.width,pad=Math.round(W*.045),inner=W-pad*2;
 const f=Math.max(horizontal?20:24,W/(horizontal?100:52))*state.scale,gap=f*.45,cf=f*state.cardScale;
 const titleSize=W*(horizontal?.035:.052)*state.titleScale,pf=f*1.08*state.periodScale;
 const titleLines=lines(state.title||'TCG 대회 일정',inner,titleSize,true);
 const period=`${state.from} (${weekday(state.from)}) — ${state.to} (${weekday(state.to)})`;
 const periodLines=lines(period,inner,pf,true);
 const headerEnd=pad+titleLines.length*titleSize*1.36+f*.6+periodLines.length*pf*1.4+f*1.2;
 const footerLines=state.footer?lines(state.footer,inner,f*.8):[];const footerH=footerLines.length*f*.8*1.36+pad;
 const dayDates=week?Array.from({length:7},(_,i)=>addDays(state.from,i)):[];
 const entries=week?dayDates.flatMap(date=>{const found=selected.filter(e=>e.date===date);return found.length?found:[{date,time:'',game:'일정 없음',color:'#c5cdd9',empty:true}];}):selected;
 const columnWidth=(inner-gap*6)/7;
 fw=state.cardWeight;
 const items=entries.map(e=>{const cardW=horizontal?columnWidth:inner-inner*.24,pw=e.image?(horizontal?columnWidth-f:Math.min(cardW*.6,cardW*.36*state.imgScale)):0,ph=e.image?(horizontal?pw*.6*state.imgScale:pw*.75):0,textWidth=cardW-f*1.8-(e.image&&!horizontal?pw+f*.6:0),heading=lines(`${e.time}${e.time?'  ':''}${e.game}`,textWidth,cf*1.2,true),detail=e.name?lines(e.name,textWidth,cf):[],metaText=[e.venue,e.fee&&`참가비 ${e.fee}`,e.capacity&&`정원 ${e.capacity}`].filter(Boolean).join(' · '),meta=metaText?lines(metaText,textWidth,cf*.85):[];const base=heading.length*cf*1.2*1.36+detail.length*cf*1.36+meta.length*cf*.85*1.36+cf*1.4;return {e,heading,detail,meta,pw,ph,h:horizontal?base+(e.image?ph+f*.5:0):Math.max(e.image?ph+f*1.1:0,base)};});fw=null;
  let measuredDate='',content=0;for(const item of items){if(item.e.date!==measuredDate){content+=gap;measuredDate=item.e.date;}content+=item.h+gap;}
 if(horizontal)content=f*3.8+Math.max(...dayDates.map(date=>items.filter(i=>i.e.date===date).reduce((sum,i)=>sum+i.h+gap,0)));
 const required=Math.ceil(headerEnd+Math.max(content,f*4)+footerH+f),layout={items};
 const H=state.autoHeight?Math.min(MAX,Math.max(state.height,required)):state.height,overflow=required>H;
 $('canvas').width=W;$('canvas').height=H;rect(0,0,W,H,state.bgColor);if(bgImg&&bgImg.complete){const r=Math.max(W/bgImg.width,H/bgImg.height)*state.bgScale/100,w=bgImg.width*r,h=bgImg.height*r;ctx.drawImage(bgImg,(W-w)/2+(state.bgX-50)/100*W,(H-h)/2+(state.bgY-50)/100*H,w,h);rect(0,0,W,H,rgba(state.bgColor,state.bgOverlay));}
 const ink=state.textColor,muted=rgba(ink,.65),cink=state.cardColor,cmuted=rgba(cink,.65),csoft=rgba(cink,.85);
 
 let y=pad;text(titleLines,pad,y,titleSize,ink,true);y+=titleLines.length*titleSize*1.36+f*.6;text(periodLines,pad,y,pf,ink,true);
 
 ctx.save();ctx.beginPath();ctx.rect(pad,headerEnd,inner,Math.max(0,H-headerEnd-footerH));ctx.clip();
 fw=state.cardWeight;
 if(horizontal){
  dayDates.forEach((date,index)=>{const x=pad+index*(columnWidth+gap),dateLabel=`${date.slice(5).replace('-','.')} (${weekday(date)})`;
   rect(x,headerEnd,columnWidth,Math.max(0,H-headerEnd-footerH-f),rgba(state.cardBg,.5));rect(x,headerEnd,columnWidth,f*3.3,state.bandBg);font(f*1.3,true);const size=f*1.3*Math.min(1,(columnWidth-f*.5)/ctx.measureText(dateLabel).width);font(size,true);text([dateLabel],x+(columnWidth-ctx.measureText(dateLabel).width)/2,headerEnd+(f*3.3-size*1.36)/2,size,state.bandColor,true);
   let top=headerEnd+f*3.8;for(const item of items.filter(i=>i.e.date===date)){rect(x,top,columnWidth,item.h,state.cardBg);drawThumb(item,x,top,columnWidth,f,true);let yy=top+f*.55+(item.e.image?item.ph+f*.5:0);text(item.heading,x+f*.9,yy,cf*1.2,item.e.empty?cmuted:cink,true);yy+=item.heading.length*cf*1.2*1.36;text(item.detail,x+f*.9,yy,cf,csoft);yy+=item.detail.length*cf*1.36;text(item.meta,x+f*.9,yy,cf*.85,cmuted);top+=item.h+gap;}
  });
 }else{
  let top=headerEnd,last='';for(const item of layout.items){if(item.e.date!==last){top+=gap;const dateLabel=`${item.e.date.slice(5).replace('-','.')} (${weekday(item.e.date)})`;font(f*1.6,true);const dateSize=f*1.6*Math.min(1,(inner*.24-f*.6)/ctx.measureText(dateLabel).width);font(dateSize,true);text([dateLabel],pad+(inner*.24-ctx.measureText(dateLabel).width)/2,top+Math.max(0,(items.filter(i=>i.e.date===item.e.date).reduce((a,i)=>a+i.h+gap,-gap)-dateSize*1.36)/2),dateSize,ink,true);last=item.e.date;}
   const x=pad+inner*.24,boxWidth=inner-(x-pad);rect(x,top,boxWidth,item.h,state.cardBg);drawThumb(item,x,top,boxWidth,f,false);let yy=top+f*.55;text(item.heading,x+f*.9,yy,cf*1.2,cink,true);yy+=item.heading.length*cf*1.2*1.36;text(item.detail,x+f*.9,yy,cf,csoft);yy+=item.detail.length*cf*1.36;text(item.meta,x+f*.9,yy,cf*.85,cmuted);top+=item.h+gap;}
 }
 fw=null;
 if(!selected.length&&!week)text(['표시할 일정이 없습니다.'],pad+f,headerEnd+f*3,f,muted);
 ctx.restore();text(footerLines,pad,H-footerH+f*.4,f*.8,muted);
 metrics={ok:!overflow,width:W,height:H,required,visible:selected.length,hidden:state.events.length-selected.length,fontSize:f,layout:state.layout,dayDates};
 $('dimensions').textContent=`${W} × ${H}px · 표시 ${selected.length}개 / 전체 ${state.events.length}개`;
 $('download').disabled=overflow;$('status').classList.toggle('error',overflow);
 $('status').textContent=overflow?`내용을 모두 표시하려면 높이 약 ${required}px가 필요합니다. ${state.autoHeight?'4096px 제한을 넘었습니다. 기간을 나누거나 글자 크기를 줄여 주세요.':'세로 자동 확장을 켜거나 규격을 변경해 주세요.'} 잘린 이미지의 저장은 차단됩니다.`:`시간과 게임명은 생략하지 않고 줄바꿈합니다.${H>state.height?` 내용에 맞춰 세로를 ${H}px로 늘렸습니다.`:''}${metrics.hidden?` 선택 기간 밖 일정 ${metrics.hidden}개는 표시하지 않습니다.`:''}`;
 }catch(e){metrics={ok:false};$('download').disabled=true;$('status').classList.add('error');$('status').textContent=e.message;}
}
loadBg();sync();editor();render();persist();
// Read-only diagnostics for local rendering checks.
window.scheduleMaker={getMetrics:()=>({...metrics}),getState:()=>JSON.parse(JSON.stringify(state)),render};
})();
