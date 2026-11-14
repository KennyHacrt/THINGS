"""Bounded Win32 input transport for THINGS' screenshot-driven agent. No eval/shell."""
import sys, os, json, time, uuid, subprocess, ctypes, io, base64
from ctypes import wintypes as W
import win32gui, win32api, win32process, win32con, win32ui
try: ctypes.windll.user32.SetProcessDpiAwarenessContext(ctypes.c_void_p(-4))
except Exception: pass
sys.stdin.reconfigure(encoding='utf-8'); sys.stdout.reconfigure(encoding='utf-8')
fresh={}
focused_points={}
def cursor_event(point,phase):
    print(json.dumps({'event':'pointer','x':point[0],'y':point[1],'phase':phase}),flush=True)
def move_pointer(destination,phase='move'):
    origin=win32api.GetCursorPos()
    if abs(origin[0]-destination[0])+abs(origin[1]-destination[1])<=1:
        win32api.SetCursorPos(destination);cursor_event(destination,phase);return
    for i in range(1,25):
        t=i/24;ease=t*t*(3-2*t)
        point=(round(origin[0]+(destination[0]-origin[0])*ease),round(origin[1]+(destination[1]-origin[1])*ease))
        current=win32api.GetCursorPos()
        if i>1 and (abs(current[0]-previous[0])+abs(current[1]-previous[1])>4):raise InputConflict('CONFLICT: Your mouse moved during the desktop action. THINGS paused.')
        win32api.SetCursorPos(point);previous=point;cursor_event(point,'move');time.sleep(.014)
    cursor_event(destination,phase)

selected_browser=None
OWNER_PID=int(sys.argv[sys.argv.index('--owner-pid')+1]) if '--owner-pid' in sys.argv else os.getppid()
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
    if (exe in blocked and not(exe=='chrome.exe' and handle==selected_browser)) or any(s in title.lower() for s in ('password manager','windows security','sign in','lock screen')): raise ValueError('This application is outside the desktop scope.')
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
class InputConflict(ValueError): pass
last_agent_tick=None
class LASTINPUTINFO(ctypes.Structure): _fields_=[('cbSize',W.UINT),('dwTime',W.DWORD)]
def input_tick():
    info=LASTINPUTINFO();info.cbSize=ctypes.sizeof(info)
    ctypes.windll.user32.GetLastInputInfo(ctypes.byref(info));return info.dwTime
def focus(handle):
    active=win32gui.GetForegroundWindow()
    if active!=handle and not win32gui.IsChild(handle,active):
        raise InputConflict('CONFLICT: You are using another window. THINGS paused before sending desktop input. Focus its task window and say resume when ready.')
    tick=input_tick();now=ctypes.windll.kernel32.GetTickCount()&0xffffffff
    if tick!=last_agent_tick and (now-tick)&0xffffffff<1200:
        raise InputConflict('CONFLICT: Recent keyboard or mouse activity detected. THINGS paused to avoid competing with you. Say resume when ready.')
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
    mapping={'Enter':[13],'Tab':[9],'Escape':[27],'Backspace':[8],'ArrowDown':[40],'ArrowUp':[38],'ArrowLeft':[37],'ArrowRight':[39],'Home':[36],'End':[35],'PageDown':[34],'PageUp':[33],'Control+A':[17,65],'Control+F':[17,70],'Control+L':[17,76]}
    if name not in mapping: raise ValueError('Unsupported key.')
    codes=mapping[name]
    try:
        for code in codes: win32api.keybd_event(code,0,0,0)
    finally:
        for code in reversed(codes): win32api.keybd_event(code,0,2,0)
def execute(action,args):
    global selected_browser,last_agent_tick
    if action=='allow_browser':
        handle=int(args['handle'])
        if not win32gui.IsWindow(handle) or executable(handle)!='chrome.exe': raise ValueError('Select a Chrome demo window.')
        title=win32gui.GetWindowText(handle)
        if not any(x in title.lower() for x in ['new tab','新分頁','新标签页','arxiv','google','flights','keeta','x.com','tokyo','skyscanner']): raise ValueError('Start from a fresh demo tab or arXiv page.')
        selected_browser=handle
        return metadata(handle)
    if action=='list': return windows()
    if action=='browser_pointer':
        handle=int(args['handle'])
        if win32process.GetWindowThreadProcessId(handle)[1] != OWNER_PID:
            raise ValueError('Pointer target must belong to the THINGS process.')
        scale=float(args.get('scale',1))
        if not 0.5 <= scale <= 4: raise ValueError('Invalid screen scale.')
        destination=(round(float(args['x'])*scale),round(float(args['y'])*scale))
        move_pointer(destination,args.get('phase','move'))
        return {'moved':True}
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
    if action=='capture':
        from PIL import Image
        handle=m['handle'];left,top,right,bottom=win32gui.GetWindowRect(handle);width=right-left;height=bottom-top
        dc=win32gui.GetWindowDC(handle);src=win32ui.CreateDCFromHandle(dc);dest=src.CreateCompatibleDC();bitmap=win32ui.CreateBitmap();bitmap.CreateCompatibleBitmap(src,width,height);dest.SelectObject(bitmap)
        try:
            if not ctypes.windll.user32.PrintWindow(W.HWND(handle),dest.GetSafeHdc(),2): raise ValueError('The selected window could not be captured.')
            image=Image.frombuffer('RGB',(width,height),bitmap.GetBitmapBits(True),'raw','BGRX',0,1)
            b=m['bounds'];x=max(0,b['x']-left);y=max(0,b['y']-top);image=image.crop((x,y,x+b['width'],y+b['height']))
            output=io.BytesIO();image.save(output,format='PNG')
            return {**m,'image':'data:image/png;base64,'+base64.b64encode(output.getvalue()).decode('ascii')}
        finally:
            dest.DeleteDC();src.DeleteDC();win32gui.ReleaseDC(handle,dc);win32gui.DeleteObject(bitmap.GetHandle())
    if action!='input': raise ValueError('Unknown operation.')
    expected=args.get('expected')
    if expected!=m['bounds']: raise ValueError('Window moved or resized. Capture a new screenshot.')
    handle=m['handle'];focus(handle);kind=args['action']
    if kind in ('click','double_click','move'):
        x=args.get('x');y=args.get('y')
        if not isinstance(x,(int,float)) or not isinstance(y,(int,float)) or not(0<=x<1 and 0<=y<1): raise ValueError('Invalid normalized coordinates.')
        destination=(round(m['bounds']['x']+x*m['bounds']['width']),round(m['bounds']['y']+y*m['bounds']['height']))
        move_pointer(destination)
        if kind!='move':
            focused_points[handle]=destination
            for _ in range(2 if kind=='double_click' else 1):
                cursor_event(destination,'down');time.sleep(.07)
                if win32api.GetCursorPos()!=destination:raise InputConflict('CONFLICT: Your mouse moved before the click. No click was sent.')
                win32api.mouse_event(2,0,0,0,0);time.sleep(.06);win32api.mouse_event(4,0,0,0,0)
                cursor_event(destination,'release');time.sleep(.08)
    elif kind=='type':
        text=args.get('text')
        if not isinstance(text,str) or len(text)>6000: raise ValueError('Text is too long.')
        if handle in focused_points:move_pointer(focused_points[handle],'type')
        if args.get('replace'):key('Control+A')
        literal(text)
    elif kind=='key': key(args.get('key'))
    elif kind=='scroll':
        delta=args.get('scrollY')
        if not isinstance(delta,int) or abs(delta)>1500: raise ValueError('Invalid scroll amount.')
        win32api.mouse_event(0x0800,0,0,-round(delta/100)*120,0)
    else: raise ValueError('Unsupported action.')
    last_agent_tick=input_tick()
    return {'executed':True}
for line in sys.stdin:
    request={}
    try:
        request=json.loads(line);response={'id':request['id'],'result':execute(request['action'],request.get('args',{}))}
    except Exception as error: response={'id':request.get('id'),'error':str(error)[:500]}
    print(json.dumps(response,ensure_ascii=False),flush=True)
