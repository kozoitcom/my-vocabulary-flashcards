/* My Learning KJ3 handwriting recognition adapter.
   Kanji Canvas © Dominik Klein (MIT): https://github.com/asdfjkl/kanjicanvas
   Third-party library and reference patterns are loaded on demand from pinned upstream.
   The learner's pen coordinates are processed locally in the browser. */
(function(global){
  'use strict';
  const BASE='https://cdn.jsdelivr.net/gh/asdfjkl/kanjicanvas@a9214105f156def3b96930e5fcf10b7652b7a1f7/docs/resources/javascript/';
  let enginePromise=null;

  function script(url){
    return new Promise((resolve,reject)=>{
      const el=document.createElement('script');
      const timeout=setTimeout(()=>{el.remove();reject(new Error('認識データの読み込みがタイムアウトしました。通信環境を確認してください。'));},45000);
      el.src=url;el.async=true;
      el.onload=()=>{clearTimeout(timeout);resolve()};
      el.onerror=()=>{clearTimeout(timeout);reject(new Error('認識データを取得できません。ネット接続を確認してください。'))};
      document.head.appendChild(el);
    });
  }

  async function loadEngine(){
    if(!enginePromise){
      enginePromise=(async()=>{
        await script(BASE+'kanji-canvas.min.js');
        await script(BASE+'ref-patterns.js');
        if(!global.KanjiCanvas||!Array.isArray(global.KanjiCanvas.refPatterns)||global.KanjiCanvas.refPatterns.length<100){
          throw new Error('漢字認識辞書を読み込めませんでした。');
        }
        return global.KanjiCanvas;
      })().catch(e=>{enginePromise=null;throw e});
    }
    return enginePromise;
  }

  function validStrokes(strokes){
    if(!Array.isArray(strokes))return [];
    return strokes.map(stroke=>(Array.isArray(stroke)?stroke:[])
      .filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(p[0])&&Number.isFinite(p[1]))
      .map(p=>[Math.max(0,Math.min(1,p[0]))*256,Math.max(0,Math.min(1,p[1]))*256]))
      .filter(stroke=>stroke.length>0);
  }
  function result(status,recognized,candidates,message){
    return {status,recognized:recognized||'',candidates:candidates||[],message};
  }
  async function evaluate(strokes,expected){
    if(typeof expected!=='string'||[...expected].length!==1){
      return result('review','',[],'漢字1文字ずつ判定してください。');
    }
    const normalized=validStrokes(strokes);
    const points=normalized.flat();
    if(points.length<3){
      return result('review','',[],'まだ十分に書かれていません。もう一度書いてください。');
    }
    const width=Math.max(...points.map(p=>p[0]))-Math.min(...points.map(p=>p[0]));
    const height=Math.max(...points.map(p=>p[1]))-Math.min(...points.map(p=>p[1]));
    if(Math.max(width,height)<25){
      return result('review','',[],'文字が小さすぎるため認識できません。大きく書いてください。');
    }
    const engine=await loadEngine();
    // The engine's stroke matcher accepts coordinate arrays, not raster screenshots.
    engine.recordedPattern_myLearningRecognition=normalized;
    let ranked;
    try{
      const norm=engine.momentNormalize('myLearningRecognition');
      const features=engine.extractFeatures(norm,20);
      const rough=engine.coarseClassification(features);
      ranked=engine.fineClassification(features,rough);
    }finally{
      delete engine.recordedPattern_myLearningRecognition;
    }
    const candidates=String(ranked||'').trim().split(/\s+/u).filter(Boolean).slice(0,10);
    if(!candidates.length){
      return result('review','',[],'候補が見つかりませんでした。正解を見て確認してください。');
    }
    const recognized=candidates[0];
    if(recognized===expected){
      return result('correct',recognized,candidates,'正解！ 手書きの文字が正しい漢字として認識されました。');
    }
    const rank=candidates.indexOf(expected);
    if(rank>=0){
      return result('review',recognized,candidates,'正しい漢字も候補にあります。文字の形を見比べて確認してください。');
    }
    return result('incorrect',recognized,candidates,'別の漢字として認識されました。見比べて、もう一度書いてみましょう。');
  }
  global.KanjiRecognition={evaluate};
})(window);
