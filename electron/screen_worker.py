"""Bounded Win32 input transport for THINGS' screenshot-driven agent. No eval/shell."""
import sys, os, json, time, uuid, subprocess, ctypes
from ctypes import wintypes as W
import win32gui, win32api, win32process, win32con
try: ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
except Exception: pass
sys.stdin.reconfigure(encoding='utf-8'); sys.stdout.reconfigure(encoding='utf-8')
fresh={}
ctypes.windll.kernel32.QueryFullProcessImageNameW.argtypes=[W.HANDLE,W.DWORD,W.LPWSTR,ctypes.POINTER(W.DWORD)]
blocked={'chrome.exe','msedge.exe','firefox.exe','cmd.exe','powershell.exe','pwsh.exe','windowsterminal.exe','taskmgr.exe','credentialuibroker.exe','consent.exe','keepass.exe','1password.exe','electron.exe','codex.exe'}
def executable(hwnd):
    pid=win32process.GetWindowThreadProcessId(hwnd)[1]
    process=win32api.OpenProcess(0x1000,False,pid)
    try:
        length=W.DWORD(32768);buffer=ctypes.create_unicode_buffer(32768)
        if not ctypes.windll.kernel32.QueryFullProcessImageNameW(int(process),0,buffer,ctypes.byref(length)): raise ValueError('Unavailable process')
        return os.path.basename(buffer.value).lower()
    finally: process.Close()
def metadata(handle):
    handle=int(handle)
    if not win32gui.IsWindow(handle) or not win32gui.IsWindowVisible(handle): raise ValueError('Target window is not visible.')
    title=win32gui.GetWindowText(handle);exe=executable(handle)
    if exe in blocked or any(s in title.lower() for s in ('password manager','windows security','sign in','lock screen')): raise ValueError('This application is outside the desktop scope.')
    if handle in fresh and fresh[handle] not in title: raise ValueError('The task-specific note is no longer active. Switch back before continuing.')
    if win32gui.IsIconic(handle): raise ValueError('Restore the target window before capturing it.')
    rect=W.RECT()
    if ctypes.windll.dwmapi.DwmGetWindowAttribute(W.HWND(handle),9,ctypes.byref(rect),ctypes.sizeof(rect))!=0:
        rect.left,rect.top,rect.right,rect.bottom=win32gui.GetWindowRect(handle)
    return {'handle':handle,'title':title[:180],'app':exe,'bounds':{'x':rect.left,'y':rect.top,'width':rect.right-rect.left,'height':rect.bottom-rect.top}}
def windows():
    output=[]
    def visit(hwnd,_):
        try:
            if win32gui.GetWindowText(hwnd): output.append(metadata(hwnd))
        except Exception: pass
    win32gui.EnumWindows(visit,None);return output
def focus(handle):
    if win32gui.IsIconic(handle): win32gui.ShowWindow(handle,win32con.SW_RESTORE)
    current=win32api.GetCurrentThreadId();foreground=win32gui.GetForegroundWindow();attached=[]
    message=W.MSG();ctypes.windll.user32.PeekMessageW(ctypes.byref(message),None,0,0,0)
    try:
        for other in {win32process.GetWindowThreadProcessId(handle)[0],win32process.GetWindowThreadProcessId(foreground)[0] if foreground else current}:
            if other!=current and ctypes.windll.user32.AttachThreadInput(current,other,True):attached.append(other)
        win32gui.BringWindowToTop(handle);win32gui.SetForegroundWindow(handle)
    except Exception: pass
    finally:
        for other in attached:ctypes.windll.user32.AttachThreadInput(current,other,False)
    time.sleep(.07)
    active=win32gui.GetForegroundWindow()
    if active!=handle and not win32gui.IsChild(handle,active): raise ValueError('Focus the selected application, then retry. Input was not sent.')
class MI(ctypes.Structure): _fields_=[('dx',W.LONG),('dy',W.LONG),('mouseData',W.DWORD),('dwFlags',W.DWORD),('time',W.DWORD),('extra',ctypes.c_size_t)]
class KI(ctypes.Structure): _fields_=[('vk',W.WORD),('scan',W.WORD),('flags',W.DWORD),('time',W.DWORD),('extra',ctypes.c_size_t)]
class IU(ctypes.Union): _fields_=[('mi',MI),('ki',KI)]
class INPUT(ctypes.Structure): _fields_=[('type',W.DWORD),('value',IU)]
ctypes.windll.user32.SendInput.argtypes=[W.UINT,ctypes.POINTER(INPUT),ctypes.c_int]
def literal(text):
    events=[]
    for char in text:
        if char=='\r': continue
        if char=='\n':
            events.extend([INPUT(1,IU(ki=KI(13,0,0,0,0))),INPUT(1,IU(ki=KI(13,0,2,0,0)))]);continue
        encoded=char.encode('utf-16-le')
        for i in range(0,len(encoded),2):
            unit=int.from_bytes(encoded[i:i+2],'little');events.extend([INPUT(1,IU(ki=KI(0,unit,4,0,0))),INPUT(1,IU(ki=KI(0,unit,6,0,0)))])
    for start in range(0,len(events),200):
        batch=events[start:start+200];array=(INPUT*len(batch))(*batch)
        if ctypes.windll.user32.SendInput(len(batch),array,ctypes.sizeof(INPUT))!=len(batch): raise ValueError('Windows rejected input to this application.')
def key(name):
    mapping={'Enter':[13],'Tab':[9],'Escape':[27],'Backspace':[8],'ArrowDown':[40],'ArrowUp':[38],'ArrowLeft':[37],'ArrowRight':[39],'Home':[36],'End':[35],'PageDown':[34],'PageUp':[33],'Control+A':[17,65],'Control+F':[17,70]}
    if name not in mapping: raise ValueError('Unsupported key.')
    codes=mapping[name]
    try:
        for code in codes: win32api.keybd_event(code,0,0,0)
    finally:
        for code in reversed(codes): win32api.keybd_event(code,0,2,0)
def execute(action,args):
    if action=='list': return windows()
    if action=='open':
        app=args.get('app')
        if app not in ('notepad','calculator'): raise ValueError('Unsupported application.')
        before={w['handle'] for w in windows()};marker=None;arguments=[]
        if app=='notepad':
            directory=os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))),'.things-local','notes');os.makedirs(directory,exist_ok=True)
            marker='THINGS Note '+str(uuid.uuid4())[:8];file=os.path.join(directory,marker+'.txt')
            with open(file,'x',encoding='utf-8'): pass
            arguments=[file]
        subprocess.Popen([os.path.join(os.environ['WINDIR'],'System32','notepad.exe' if app=='notepad' else 'calc.exe')]+arguments,shell=False)
        deadline=time.monotonic()+12
        while time.monotonic()<deadline:
            for w in windows():
                matched=marker and marker in w['title'] and w['app']=='notepad.exe'
                if matched or (not marker and w['handle'] not in before and w['app'] in ('calculatorapp.exe','calculator.exe','applicationframehost.exe')):
                    if marker:fresh[w['handle']]=marker
                    return w
            time.sleep(.2)
        raise ValueError('Could not identify the new app. Select its window manually.')
    m=metadata(args['handle'])
    if action=='metadata': return m
    if action!='input': raise ValueError('Unknown operation.')
    expected=args.get('expected')
    if expected!=m['bounds']: raise ValueError('Window moved or resized. Capture a new screenshot.')
    handle=m['handle'];focus(handle);kind=args['action']
    if kind in ('click','double_click','move'):
        x=args.get('x');y=args.get('y')
        if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not(0<=x<1 and 0<=y<1): raise ValueError('Invalid normalized coordinates.')
        win32api.SetCursorPos((round(m['bounds']['x']+x*m['bounds']['width']),round(m['bounds']['y']+y*m['bounds']['height'])))
        if kind!='move':
            for _ in range(2 if kind=='double_click' else 1):
                win32api.mouse_event(2,0,0,0,0);win32api.mouse_event(4,0,0,0,0);time.sleep(.07)
    elif kind=='type':
        text=args.get('text')
        if not isinstance(text,str) or len(text)>6000: raise ValueError('Text is too long.')
        if args.get('replace'):key('Control+A')
        literal(text)
    elif kind=='key': key(args.get('key'))
    elif kind=='scroll':
        delta=args.get('scrollY')
        if not isinstance(delta,int) or abs(delta)>1500: raise ValueError('Invalid scroll amount.')
        win32api.mouse_event(0x0800,0,0,-round(delta/100)*120,0)
    else: raise ValueError('Unsupported action.')
    return {'executed':True}
for line in sys.stdin:
    request={}
    try:
        request=json.loads(line);response={'id':request['id'],'result':execute(request['action'],request.get('args',{}))}
    except Exception as error: response={'id':request.get('id'),'error':str(error)[:500]}
    print(json.dumps(response,ensure_ascii=False),flush=True)
