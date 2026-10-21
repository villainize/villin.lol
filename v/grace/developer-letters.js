(() => {
  const settings=window.GraceLetterSettings;
  const container=document.querySelector('#letter-editors');
  function field(parent,label,value,kind='textarea'){
    const wrap=document.createElement('label');wrap.className='dev-field';wrap.textContent=label;
    const input=document.createElement(kind);input.value=value;
    if(kind==='textarea')input.rows=3;
    wrap.append(input);parent.append(wrap);return input;
  }
  function render(config=settings.read()){
    container.replaceChildren();
    for(const [key,title,help] of [
      ['opening','Opening birthday letter','The first letter Grace opens when she arrives at the site.'],
      ['puzzleLetter','Puzzle completion letter','Shown after finishing any of the four jigsaws and when reading its birthday credits.']
    ]){
      const section=document.createElement('section');section.className='dev-section';
      const heading=document.createElement('h2');heading.textContent=title;
      const description=document.createElement('p');description.textContent=help;section.append(heading,description);
      for(const [property,label] of [['title','Letter heading'],['text','Letter message'],...(key==='opening'?[['signoff','Sign-off']]:[])]){
        const input=field(section,label,config[key][property],property==='text'?'textarea':'input');
        input.dataset.letterSection=key;input.dataset.letterField=property;if(property==='text')input.rows=8;
      }
      container.append(section);
    }
    const letters=document.createElement('section');letters.className='dev-section';
    letters.innerHTML='<h2>Letter hunt messages</h2><p>Each of the 23 envelopes has its own sweet note. The quiz letter is chosen randomly each game.</p>';
    config.notes.forEach((note,i)=>{const input=field(letters,`Envelope ${i+1}`,note);input.dataset.note=i;});
    const quiz=document.createElement('section');quiz.className='dev-section';
    quiz.innerHTML='<h2>The ten quiz questions</h2><p>Edit all four choices and choose the correct answer. The game shuffles their order.</p>';
    config.questions.forEach((question,i)=>{
      const row=document.createElement('article');row.className='dev-card-editor';row.dataset.question=i;
      const heading=document.createElement('h3');heading.textContent=`Question ${i+1}`;row.append(heading);
      field(row,'Question',question.q).dataset.prompt='';
      question.a.forEach((answer,j)=>{field(row,`Answer ${'ABCD'[j]}`,answer,'input').dataset.answer=j;});
      const label=document.createElement('label');label.className='dev-field';label.textContent='Correct answer';
      const select=document.createElement('select');select.setAttribute('aria-label',`Correct answer for question ${i+1}`);
      question.a.forEach((_,j)=>{const option=document.createElement('option');option.value=j;option.textContent=`Answer ${'ABCD'[j]}`;select.append(option);});
      select.value=question.correct;label.append(select);row.append(label);quiz.append(row);
    });
    container.append(letters,quiz);
  }
  function collect(){
    const config={notes:[...container.querySelectorAll('[data-note]')].map(el=>el.value.trim()),questions:[...container.querySelectorAll('[data-question]')].map(row=>({q:row.querySelector('[data-prompt]').value.trim(),a:[...row.querySelectorAll('[data-answer]')].map(el=>el.value.trim()),correct:Number(row.querySelector('select').value)}))};
    if(!settings.valid(config))throw new Error('Fill in all 23 letter messages, all ten questions, and all four answers for each question.');
    for(const key of ['opening','puzzleLetter']){
      config[key]={};
      container.querySelectorAll(`[data-letter-section="${key}"]`).forEach(input=>{config[key][input.dataset.letterField]=input.value.trim();});
      if(!config[key].title||!config[key].text)throw new Error('Please give the opening birthday letter and puzzle letter a heading and message.');
    }
    return config;
  }
  window.GraceLetterEditor={collect,render};
  render();
})();
