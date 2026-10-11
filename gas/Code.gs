/** Ver.G11: 共通リストAPI。GASのスクリプトプロパティに SHEET_ID / EDIT_KEY を設定してください。 */
const TAB='decks';
function sheet_(){
 const id=PropertiesService.getScriptProperties().getProperty('SHEET_ID');
 if(!id)throw Error('SHEET_ID が未設定です');
 const ss=SpreadsheetApp.openById(id);
 let sh=ss.getSheetByName(TAB);
 if(!sh){sh=ss.insertSheet(TAB);sh.appendRow(['id','name','url']);}
 return sh;
}
function all_(){
 const rows=sheet_().getDataRange().getValues().slice(1);
 return rows.filter(r=>r[0]&&r[1]&&r[2]).map(r=>({id:String(r[0]),name:String(r[1]),url:String(r[2])}));
}
function json_(data,callback){
 const body=JSON.stringify(data);
 if(callback&&/^[a-zA-Z_$][\w$]{0,80}$/.test(callback)){
  return ContentService.createTextOutput(callback+'('+body+');').setMimeType(ContentService.MimeType.JAVASCRIPT);
 }
 return ContentService.createTextOutput(body).setMimeType(ContentService.MimeType.JSON);
}
function doGet(e){
 try{return json_({ok:true,decks:all_()},(e.parameter||{}).callback);}
 catch(err){return json_({ok:false,error:String(err.message)},(e.parameter||{}).callback);}
}
function doPost(e){
 const lock=LockService.getScriptLock();lock.waitLock(15000);
 try{
  const p=JSON.parse((e.postData||{}).contents||'{}');
  const secret=PropertiesService.getScriptProperties().getProperty('EDIT_KEY');
  if(!secret||String(p.key||'')!==secret)throw Error('編集キーが違います');
  const sh=sheet_();const list=all_();
  if(p.action==='add'){
   const name=String(p.name||'').trim(),url=String(p.url||'').trim();
   if(!name||name.length>120||!/^https:\/\/docs\.google\.com\/spreadsheets\//i.test(url)||url.length>2000)throw Error('登録内容が不正です');
   if(list.some(x=>x.url===url))throw Error('既に登録されています');
   sh.appendRow([String(p.id||Utilities.getUuid()),name,url]);
  }else if(p.action==='remove'){
   const i=list.findIndex(x=>x.id===p.id);if(i<0)throw Error('対象がありません');
   const values=sh.getDataRange().getValues();
   const row=values.findIndex((r,n)=>n>0&&String(r[0])===p.id);
   if(row<0)throw Error('対象がありません');
   sh.deleteRow(row+1);
  }else throw Error('操作が不正です');
  return json_({ok:true});
 }catch(err){return json_({ok:false,error:String(err.message)})}
 finally{lock.releaseLock();}
}
