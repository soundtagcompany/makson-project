AUDIO=['mp3','m4a','wav','flac','ogg','opus','aac','aiff']
VIDEO=['mp4','webm','mkv','mov','avi','gif']
IMAGE=['jpg','png','webp','avif','gif','tiff','bmp','ico','pdf']
GROUPS={
 'video':{'label':'Видео','input':['mp4','mkv','mov','webm','avi','m4v','mpg','mpeg','wmv','flv','ts','3gp'],'output':VIDEO+AUDIO},
 'audio':{'label':'Аудио','input':AUDIO+['wma','amr','aif','oga'],'output':AUDIO},
 'image':{'label':'Изображения','input':IMAGE[:-1]+['jpeg','tif','heic','heif','svg','tga'],'output':IMAGE},
 'document':{'label':'Документы','input':['doc','docx','odt','rtf','txt','html','htm'],'output':['pdf','docx','odt','rtf','txt','html']},
 'spreadsheet':{'label':'Таблицы','input':['xlsx','xls','ods','csv','tsv'],'output':['pdf','xlsx','ods','csv','tsv']},
 'presentation':{'label':'Презентации','input':['pptx','ppt','odp'],'output':['pdf','pptx','odp']},
 'pdf':{'label':'PDF','input':['pdf'],'output':['txt','png','jpg']},
 'text':{'label':'Текст и книги','input':['md','markdown','epub'],'output':['docx','odt','html','txt','md','epub']}
}
NOTES={'pdf':'Страницы PDF → PNG/JPG сохраняются одним ZIP. Текст извлекается из текстового слоя; OCR пока нет.',
'image':'Для JPG прозрачность заменяется выбранным фоном. Анимированные изображения преобразуются по первому кадру.',
'document':'При смене формата сложная вёрстка может измениться. TXT сохраняет только текст.',
'spreadsheet':'CSV/TSV сохраняют один лист без оформления. Для всех листов выбирай XLSX, ODS или PDF.',
'presentation':'PPTX и ODP сохраняют редактирование; PDF сохраняет страницы без анимации.',
'audio':'FLAC и WAV не восстанавливают качество, уже потерянное в исходнике.',
'video':'MP4 — совместимый H.264. WebM — VP9. GIF сохраняется без звука.',
 'text':'Сохраняются текст, структура и поддерживаемые изображения.'}
def family(ext):
 return next((key for key,group in GROUPS.items() if ext in group['input']),None)
