/* My Learning KJ3 recognition UI extension.
   Extends the existing KJ2 flashcard and handwriting flow without changing CSV columns.
   Kanji Canvas © Dominik Klein, https://github.com/asdfjkl/kanjicanvas (MIT). */
(function(){
  'use strict';
  const byId=id=>document.getElementById(id);
  const writing=byId('writingPanel');
  const card=byId('card');
  if(!writing||!card)return;
  const style=document.createElement('style');
  style.textContent=
    '#kanjiGradeBox{border:1px solid #cbd8e8;border-radius:12px;padding:14px;background:#f4f8ff;margin:10px 0 14px;line-height:1.6}'+
    '#kanjiGradeBox.grade-correct{background:#eaf8ef;border-color:#83c89f}'+
    '#kanjiGradeBox.grade-incorrect{background:#fff1ef;border-color:#e8aaa3}'+
    '#kanjiGradeBox.grade-review{background:#fff8e9;border-color:#dfca8c}'+
    '#kanjiGradeTitle{font-size:21px;font-weight:800;margin-bottom:5px}'+
    '#kanjiGradeDetails{font-size:14px}'+
    '#kanjiGradeBox button{margin-top:10px;padding:9px;font-size:13px}'+
    '#kanjiCheckStatus{font-size:13px;line-height:1.5;margin:8px 0;color:#52657b;min-height:20px}'+
    '#kanjiCharSwitch{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0}'+
    '#kanjiCharSwitch button{min-width:70px;padding:9px;flex:1;font-size:13px}'+
    '#kanjiCharSwitch button.active{background:#1765d1;color:white}'+
    '#kanjiCheckButton{background:#0c8064;color:white}'+
    '#kanjiGradeBox[hidden],#kanjiCharSwitch[hidden]{display:none!important}';
  document.head.append(style);

  const resultBox=document.createElement('div');
  resultBox.id='kanjiGradeBox';resultBox.hidden=true;resultBox.setAttribute('role','status');
  resultBox.setAttribute('aria-live','polite');
  const title=document.createElement('div');title.id='kanjiGradeTitle';
  const details=document.createElement('div');details.id='kanjiGradeDetails';
  const manual=document.createElement('button');manual.id='kanjiGradeManual';
  manual.textContent='自分で正しいと確認した';
  resultBox.append(title,details,manual);
  card.after(resultBox);

  const heading=writing.querySelector('.writingTitle');
  const charSwitch=document.createElement('div');
  charSwitch.id='kanjiCharSwitch';charSwitch.hidden=true;
  heading.after(charSwitch);

  const newRow=document.createElement('div');newRow.className='row';
  newRow.style.marginTop='9px';
  const check=document.createElement('button');
  check.id='kanjiCheckButton';check.textContent='✓ 自動判定';
  const hint=document.createElement('button');
  hint.textContent='答えを見る';
  // Retain the original "答えを見る" control; replace only the spare position.
  const previousShow=byId('showAnswer');
  if(previousShow){previousShow.style.display='none';}
  hint.onclick=()=>previousShow?.click();
  newRow.append(check,hint);
  writing.querySelector('.inkWrap').nextElementSibling.after(newRow);

  const status=document.createElement('div');
  status.id='kanjiCheckStatus';status.setAttribute('role','status');
  status.textContent='書いた漢字を自動で読み取ります。初回の判定時は辞書を取得します。';
  newRow.after(status);
  const credit=document.createElement('p');credit.className='muted';
  credit.style.textAlign='center';credit.style.fontSize='11px';
  const link=document.createElement('a');
  link.href='https://github.com/asdfjkl/kanjicanvas';link.target='_blank';link.rel='noopener noreferrer';
  link.textContent='Kanji Canvas';
  credit.append('手書き認識：',link,'（MIT）。筆順・はね・はらいの厳密採点ではありません。');
  status.after(credit);

  let active='',characterIndex=0,assessment=null,requestId=0,busy=false;
  let records={};
  try{records=read('assessments',{})}catch(e){records={}}
  const chars=()=>current()?[...current()[1]]:[];
  const identity=()=>current()?selected+'|'+key(current()):'';
  function persist(state,recognized){
    if(!current())return;
    records[selected]||={};
    records[selected][key(current())+'#'+characterIndex]={
      status:state,recognized:recognized||'',at:new Date().toISOString()
    };
    try{put('assessments',records)}catch(e){}
  }
  function resetResult(){
    requestId++;busy=false;assessment=null;check.disabled=!current();
    status.textContent='書いた漢字を自動で読み取ります。初回の判定時は辞書を取得します。';
    resultBox.hidden=true;
  }
  function renderResult(){
    resultBox.hidden=!assessment||!flipped||!current();
    if(resultBox.hidden)return;
    const st=assessment.status;
    resultBox.className=st==='correct'?'grade-correct':st==='incorrect'?'grade-incorrect':'grade-review';
    title.textContent=st==='correct'?'✓ 正解！':st==='incorrect'?'✕ 不正解':st==='self'?'✓ 自己確認済み':'？ 要確認';
    details.replaceChildren();
    const lines=[
      assessment.message||'',
      '正しい漢字：'+(chars()[characterIndex]||''),
      '認識した漢字：'+(assessment.recognized||'認識できませんでした'),
      assessment.candidates?.length?'ほかの候補：'+assessment.candidates.slice(1,4).join('・'):''
    ];
    lines.filter(Boolean).forEach(line=>{const div=document.createElement('div');div.textContent=line;details.append(div)});
    manual.hidden=(st==='correct'||st==='self');
  }
  function updateUi(){
    const id=identity();
    if(active!==id){active=id;characterIndex=0;resetResult()}
    const multiple=chars().length>1;
    charSwitch.hidden=!current()||!multiple;
    charSwitch.replaceChildren();
    if(multiple){
      chars().forEach((ch,index)=>{
        const b=document.createElement('button');b.textContent=(index+1)+'文字目';
        b.classList.toggle('active',characterIndex===index);
        b.setAttribute('aria-pressed',String(characterIndex===index));
        b.onclick=()=>{
          if(characterIndex===index)return;
          characterIndex=index;resetResult();resetInk();render();
        };
        charSwitch.append(b);
      });
    }
    if(heading){
      const label=heading.querySelector('.muted');
      if(label)label.textContent=multiple?(characterIndex+1)+' / '+chars().length+'文字目':'指・タッチペン対応';
    }
    check.disabled=!current()||flipped||busy;
    renderResult();
  }

  const originalRender=render;
  render=function(){
    const value=originalRender.apply(this,arguments);
    updateUi();
    return value;
  };
  updateUi();

  // A new ink stroke invalidates earlier assessment results but does not mark a word as learned.
  byId('inkCanvas').addEventListener('pointerdown',()=>{
    if(!flipped&&current())resetResult();
  });
  [byId('clearInk'),byId('undoInk'),byId('retryInk')].forEach(btn=>{
    btn?.addEventListener('click',()=>{resetResult();updateUi()});
  });
  byId('resetKnown')?.addEventListener('click',updateUi);

  check.addEventListener('click',async()=>{
    if(busy||!current()||flipped)return;
    if(!inkStrokes.length){
      status.textContent='まず枠の中に漢字を書いてください。';return;
    }
    if(!window.KanjiRecognition?.evaluate){
      status.textContent='認識プログラムを読み込めませんでした。再読み込みしてください。';return;
    }
    const expected=chars()[characterIndex];
    const start=identity(),idx=characterIndex,seq=++requestId;
    const strokes=inkStrokes.map(stroke=>stroke.map(p=>[...p]));
    busy=true;check.disabled=true;
    status.textContent='手書き文字を認識しています。初回はデータの取得が必要です。';
    try{
      const outcome=await window.KanjiRecognition.evaluate(strokes,expected);
      if(seq!==requestId||identity()!==start||idx!==characterIndex)return;
      assessment=outcome;
      persist(outcome.status,outcome.recognized);
      flipped=true;
      render();
    }catch(e){
      if(seq===requestId)status.textContent='認識できませんでした：'+(e.message||String(e))+'。手動の答え合わせをご利用ください。';
    }finally{
      if(seq===requestId){busy=false;check.disabled=!current()||flipped;}
    }
  });
  manual.addEventListener('click',()=>{
    if(!assessment||!current())return;
    assessment={...assessment,status:'self',message:'自分で正しいことを確認しました。自動判定の結果とは区別して保存します。'};
    persist('self',assessment.recognized);renderResult();
  });
})();
