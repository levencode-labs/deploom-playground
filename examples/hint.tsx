import * as React from 'react';
import {createRoot} from 'react-dom/client';

// The hint attaches interaction handlers to the DOM element supplied by its child.
type BadgeProps = {ref?: React.Ref<HTMLButtonElement>, label: string, described?: string};
function Badge({label, described}: BadgeProps) {
  return <button type="button" aria-describedby={described}>{label}</button>;
}
function ConnectedBadge({ref, label, described}: BadgeProps) {
  return <button type="button" ref={ref} aria-describedby={described}>{label}</button>;
}

function HintLesson() {
  const en=document.documentElement.lang==='en';
  const [fixed,setFixed]=React.useState(new URLSearchParams(location.search).get('anchor')==='connected');
  const [anchor,setAnchor]=React.useState<HTMLButtonElement|null>(null);
  const [visible,setVisible]=React.useState(false);
  React.useEffect(()=>{
    if(!anchor)return;
    const show=()=>setVisible(true), hide=()=>setVisible(false);
    for(const event of ['mouseenter','focus','click']) anchor.addEventListener(event,show);
    for(const event of ['mouseleave','blur']) anchor.addEventListener(event,hide);
    return ()=>{
      for(const event of ['mouseenter','focus','click']) anchor.removeEventListener(event,show);
      for(const event of ['mouseleave','blur']) anchor.removeEventListener(event,hide);
    };
  },[anchor]);
  const Status=fixed?ConnectedBadge:Badge;
  function change(value:boolean) {
    setFixed(value);setVisible(false);
    const url=new URL(location.href);url.searchParams.set('anchor',value?'connected':'missing');
    try{history.replaceState(null,'',url);}catch{}
    const language=document.querySelector<HTMLAnchorElement>('a.language');
    if(language){const link=new URL(url);link.searchParams.set('lang',en?'ru':'en');language.href=link.href;}
  }
  return <div>
    <div className="hint-demo"><Status ref={setAnchor} label={en?'●  Pending review':'●  На проверке'} described={visible?'hint-bubble':undefined}/>
      {visible && <span id="hint-bubble" role="tooltip">{en?'Waiting for a reviewer':'Ожидает проверки коллегой'}</span>}
    </div>
    <p>{en?'Hover the status, focus it with Tab, or tap.':'Наведите мышь на статус, перейдите к нему клавишей Tab или коснитесь его.'}</p>
    <p><code>{anchor?'anchor → <button>':'anchor → null'}</code>{anchor ?
      (en?' · The hint can attach its hover handler.':' · Подсказка получила кнопку и может подписаться на наведение.') :
      (en?' · The status is visible. The hint has no element to listen on.':' · Статус виден. Подсказке некуда повесить обработчик наведения.')}</p>
    <pre>{fixed?'return <button ref={ref}>{label}</button>':'return <button>{label}</button>'}</pre>
    <button className="button" type="button" onClick={()=>change(!fixed)}>{fixed ?
      (en?'Remove the ref and retry':'Убрать ref и сравнить') : (en?'Pass ref to the button and retry':'Передать ref кнопке и попробовать снова')}</button>
  </div>;
}
const mount=document.getElementById('hint-mount');
if(mount)createRoot(mount).render(<HintLesson/>);
