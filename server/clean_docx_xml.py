import zipfile
import os
import xml.etree.ElementTree as ET
import glob

def clean_xml(xml_bytes):
    # Register namespaces
    namespaces = {
        'w': 'http://schemas.openxmlformats.org/wordprocessingml/2006/main'
    }
    for prefix, uri in namespaces.items():
        ET.register_namespace(prefix, uri)
        
    root = ET.fromstring(xml_bytes)
    
    # Remove highlights and underlines
    for elem in root.iter():
        # Remove w:highlight
        highlight = elem.find('w:highlight', namespaces)
        if highlight is not None:
            elem.remove(highlight)
            
        # Remove w:u
        underline = elem.find('w:u', namespaces)
        if underline is not None:
            elem.remove(underline)
            
        # Remove w:shd (shading)
        shading = elem.find('w:shd', namespaces)
        if shading is not None:
            elem.remove(shading)

    # Remove paragraphs with 'Nota:'
    body = root.find('w:body', namespaces)
    if body is not None:
        to_remove = []
        for p in body.findall('w:p', namespaces):
            # Extract text from paragraph
            texts = p.findall('.//w:t', namespaces)
            full_text = ''.join([t.text for t in texts if t.text])
            if 'Nota:' in full_text or 'NOTA:' in full_text:
                to_remove.append(p)
        for p in to_remove:
            body.remove(p)
            
    return ET.tostring(root, encoding='utf-8', xml_declaration=True)

def process_docx(file_path):
    print(f'Processing {file_path}')
    backup_path = file_path + '.pybak'
    if not os.path.exists(backup_path):
        with open(file_path, 'rb') as f_in, open(backup_path, 'wb') as f_out:
            f_out.write(f_in.read())
            
    with zipfile.ZipFile(backup_path, 'r') as zin, zipfile.ZipFile(file_path, 'w') as zout:
        for item in zin.infolist():
            content = zin.read(item.filename)
            if item.filename.endswith('.xml'):
                try:
                    content = clean_xml(content)
                except Exception as e:
                    pass
            zout.writestr(item, content)

for f in glob.glob('/home/ubuntu/serambienteai/server/templates/reports/*.docx'):
    if not f.endswith('.backup') and not f.endswith('.pybak'):
        process_docx(f)

print('Done cleaning.')
