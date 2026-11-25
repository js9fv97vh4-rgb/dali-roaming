/* Shared disclosure for real photographs and generated artwork. */
window.MediaCredits = (() => {
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const isAI=p=>p?.mediaType==='ai';
  const label=p=>isAI(p)?'AI生成 · 艺术演绎':'实拍';
  const badge=p=>isAI(p)?'<span class="media-badge">AI生成 · 艺术演绎</span>':'';
  const summary=photos=>{const ai=photos.filter(isAI).length;return ai===photos.length&&ai?`${ai} 张AI演绎`:`${photos.length-ai} 张实拍${ai?' · '+ai+' 张AI演绎':''}`;};
  const credit=p=>isAI(p)
    ? `AI生成 · 艺术演绎 · ${esc(p.generator)} · 生成日期 ${esc(p.generatedAt)}<br>非现场实拍，不代表实际天气、精确机位或现状。<br>景观参考：${(p.references||[]).map((url,i)=>`<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">资料 ${i+1}</a>`).join(' · ')}`
    : `摄影：${esc(p.author)} · ${esc(p.date||(p.shotDate?'拍摄于'+p.shotDate:'拍摄日期未注明'))} · <a href="${esc(p.source)}" target="_blank" rel="noopener noreferrer">原作与来源</a> · ${p.licenseUrl?`<a href="${esc(p.licenseUrl)}" target="_blank" rel="noopener noreferrer">${esc(p.license)}</a>`:esc(p.license)}`;
  return {isAI,label,badge,summary,credit};
})();
