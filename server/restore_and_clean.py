import zipfile
import os
import xml.etree.ElementTree as ET
import glob
import shutil

def clean_xml(xml_bytes):
    namespaces = {'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
    for prefix, uri in namespaces.items():
        ET.register_namespace(prefix, uri)
    
    root = ET.fromstring(xml_bytes)
    
    for elem in root.iter():
        highlight = elem.find('w:highlight', namespaces)
        if highlight is not None: elem.remove(highlight)
            
        underline = elem.find('w:u', namespaces)
        if underline is not None: elem.remove(underline)
            
        shading = elem.find('w:shd', namespaces)
        if shading is not None: elem.remove(shading)

    body = root.find('w:body', namespaces)
    if body is not None:
        to_remove = []
        for p in body.findall('.//w:p', namespaces):
            texts = p.findall('.//w:t', namespaces)
            full_text = ''.join([t.text for t in texts if t.text])
            if 'Nota:' in full_text or 'NOTA:' in full_text:
                to_remove.append(p)
        for p in to_remove:
            for parent in root.iter():
                if p in parent:
                    parent.remove(p)
                    break
            
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)

for f in glob.glob('/home/ubuntu/serambienteai/server/templates/reports/*.docx'):
    if f.endswith('.backup') or f.endswith('.pybak'): continue
    
    backup_path = f + '.backup' # Original uncorrupted backup
    if not os.path.exists(backup_path):
        print('Warning: No backup found for', f)
        continue
        
    print(f'Restoring and cleaning {f}')
    
    with zipfile.ZipFile(backup_path, 'r') as zin, zipfile.ZipFile(f, 'w') as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename == 'word/document.xml' or item.filename.startswith('word/header') or item.filename.startswith('word/footer'):
                try:
                    content = clean_xml(content)
                except Exception as e:
                    print(f'Error processing {item.filename}:', e)
            zout.writestr(item, content)

print('Done cleaning from clean backups.')
