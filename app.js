const VERS=['19.0','18.0','17.0','16.0'];
const OS={ubuntu:{n:'Ubuntu',pm:'apt'},debian:{n:'Debian',pm:'apt'},fedora:{n:'Fedora',pm:'dnf'},rhel:{n:'RHEL / Alma / Rocky',pm:'dnf'},arch:{n:'Arch Linux',pm:'pacman'}};
const D={v:'18.0',os:'ubuntu',mode:'system',port:'8069',dir:'',user:'odoo',db:'',branch:'',workers:'0',pg:1,wk:1,rtl:1,svc:1,shallow:1,proxy:0,listdb:0,tab:'install',repo:'',ppdb:0,pdbs:'',prole:0,pkeep:1,prtl:1,pfs:1,puser:1,ppg:0};
const TG=[
['pg','Install and configure PostgreSQL','Installs the server, starts it and creates a database role for Odoo.',s=>s.mode==='system'],
['wk','Install wkhtmltopdf (PDF reports)','Uses your distribution’s package. Without the patched Qt build, PDF headers and footers may be missing.'],
['rtl','Install rtlcss (right-to-left languages)','Only needed for Arabic, Hebrew, Persian and similar.'],
['svc','Run as a systemd service','Creates odoo.service and starts it at boot.',s=>s.mode==='system'],
['shallow','Shallow clone','Downloads only the latest commit: much smaller and faster. Turn off for full history.']];
const ADV=[
['proxy','Behind a reverse proxy','Sets proxy_mode, for nginx or Caddy in front of Odoo.'],
['listdb','Show the database manager','Sets list_db. Leave off on a public server.']];
const PTG=[
['ppdb','Drop Odoo databases','Uses the names below. On a system-wide install with no names, drops every database owned by the service user.'],
['prole','Drop the PostgreSQL role','Removes the service user’s database role. Skipped if it still owns databases.',s=>s.mode==='system'],
['pkeep','Keep custom-addons','Moves your custom-addons folder to your home folder before deleting the rest.'],
['prtl','Uninstall rtlcss','Removes the npm package the install script added.'],
['pfs','Remove the filestore and sessions','Deletes ~/.local/share/Odoo, where a user install keeps attachments.',s=>s.mode==='user'],
['puser','Remove the service user','Deletes the system account created for Odoo.',s=>s.mode==='system'],
['ppg','Uninstall PostgreSQL itself','Removes the server and every database on it, not only Odoo’s. Leave off if other software uses it.',s=>s.mode==='system']];
const st={...D};
(function(){const q=new URLSearchParams(location.search);for(const k in D){if(!q.has(k))continue;const v=q.get(k);st[k]=typeof D[k]==='number'?(v==='1'?1:0):v}
if(!VERS.includes(st.v))st.v=D.v;if(!OS[st.os])st.os=D.os;if(!['system','user'].includes(st.mode))st.mode=D.mode;if(!['install','fish','purge'].includes(st.tab))st.tab=D.tab})();
const P={
apt:['git','build-essential','python3','python3-dev','python3-venv','python3-pip','libxml2-dev','libxslt1-dev','libldap2-dev','libsasl2-dev','libpq-dev','libjpeg-dev','zlib1g-dev','libffi-dev','libssl-dev','libfreetype6-dev'],
dnf:['git','gcc','gcc-c++','make','redhat-rpm-config','libxml2-devel','libxslt-devel','openldap-devel','cyrus-sasl-devel','libpq-devel','libjpeg-turbo-devel','zlib-devel','libffi-devel','openssl-devel','freetype-devel'],
pacman:['base-devel','git','python','libxml2','libxslt','libldap','libsasl','postgresql-libs','libjpeg-turbo','zlib','libffi','openssl','freetype2']};
const PG={apt:['postgresql'],dnf:['postgresql-server','postgresql-contrib'],pacman:['postgresql']};
const clean=p=>{p=(p||'').trim().replace(/^~(?=\/|$)/,'$HOME').replace(/\/+$/,'');return /^(\$HOME)?(\/[\w.+-]+)+$/.test(p)?p:''};
function wrap(pre,pk){const o=[];let l=pre;for(const p of pk){if(l.length+p.length+1>76&&l!==pre){o.push(l+' \\');l='    '+p}else l+=' '+p}o.push(l);return o}
function model(s){
const sys=s.mode==='system',o=OS[s.os],vn=parseFloat(s.v);
return{s,sys,o,vn,
dir:clean(s.dir)||(sys?'/opt/odoo':'$HOME/odoo'),
user:/^[a-z_][a-z0-9_-]{0,30}$/.test(s.user)?s.user:'odoo',
port:/^\d{2,5}$/.test(s.port)?s.port:'8069',
db:/^\w+$/.test(s.db)?s.db:'',
workers:/^\d{1,2}$/.test(s.workers)?s.workers:'0',
branch:/^[\w.\/-]+$/.test(s.branch)?s.branch:s.v,
repo:/^https:\/\/[\w.-]+(\/[\w.~+-]+)+$/.test(s.repo)?s.repo:'https://github.com/odoo/odoo.git',
pyv:o.pm==='dnf'?(vn>=17?'3.12':'3.10'):'3',
minpy:vn>=17?[3,10]:[3,7]}}
function notes(m){const n=[];if(m.s.tab==='purge')n.push('Build dependencies and wkhtmltopdf stay installed because other software may use them. Read the list the script prints before you confirm.');
if(!m.sys)n.push('Packages that need an administrator are listed as comments at the top of the script. Ask your admin to run them first, including the PostgreSQL role.');
if(m.o.pm==='pacman'&&m.vn<=18)n.push('Arch ships a newer Python than Odoo '+m.s.v+' supports. Pinned dependencies may fail to build; consider an older Python from pyenv or the AUR.');
if(m.s.os==='rhel')n.push('Needs the CodeReady Builder (CRB) repository for the -devel packages. On RHEL itself, enable it with subscription-manager.');
if(m.branch!==m.s.v)n.push('Custom branch or tag: the Python requirement check still uses the version you picked above.');
return n}
function deps(m){const{s,o}=m,PY=o.pm==='dnf'?'python'+m.pyv:'python3',L=[];
const pk=[...P[o.pm]];if(o.pm==='dnf')pk.push(PY,PY+'-devel');
if(s.pg&&m.sys)pk.push(...PG[o.pm]);
const wk='wkhtmltopdf not available from your repositories: install the patched build from https://wkhtmltopdf.org/downloads.html';
if(o.pm==='apt'){L.push('sudo apt-get update',...wrap('sudo DEBIAN_FRONTEND=noninteractive apt-get install -y',pk));if(s.rtl)L.push('command -v npm >/dev/null || sudo DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs npm');if(s.wk)L.push('sudo apt-get install -y wkhtmltopdf || echo "'+wk+'"')}
else if(o.pm==='dnf'){if(s.os==='rhel')L.push('sudo dnf -y install dnf-plugins-core','sudo dnf config-manager --set-enabled crb || true');L.push(...wrap('sudo dnf -y install',pk));if(s.rtl)L.push('command -v npm >/dev/null || sudo dnf -y install nodejs npm');if(s.wk)L.push('sudo dnf -y install wkhtmltopdf || echo "'+wk+'"')}
else{L.push(...wrap('sudo pacman -S --needed --noconfirm',pk));if(s.rtl)L.push('command -v npm >/dev/null || sudo pacman -S --needed --noconfirm nodejs npm');if(s.wk)L.push('sudo pacman -S --needed --noconfirm wkhtmltopdf || echo "'+wk+'"')}
if(s.pg||!m.sys){
if(o.pm==='dnf')L.push('sudo postgresql-setup --initdb || true');
if(o.pm==='pacman')L.push('sudo -iu postgres initdb -D /var/lib/postgres/data || true');
if(m.sys)L.push('sudo systemctl enable --now postgresql');
L.push(m.sys?'sudo -u postgres createuser -s '+m.user+' 2>/dev/null || true':'sudo -u postgres createuser -s "$USER"')}
return L}
function gen(s){
const m=model(s),{sys,o,vn}=m,S=sys?'sudo ':'',AS=sys?'sudo -u '+m.user+' -H ':'',L=[],a=(...x)=>L.push(...x);
const PY=o.pm==='dnf'?'python'+m.pyv:'python3',mp=m.minpy.join('.'),host=new URL(m.repo).hostname;
a('#!/usr/bin/env bash','# Odoo '+s.v+' (Community) on '+o.n+', installed '+(sys?'system-wide (uses sudo)':'just for you (no sudo)')+' to '+m.dir,
'# Generated by build-odoo-from-source. Review before running. Uninstall: '+S+'rm -rf "'+m.dir+'"'+(sys?' /etc/odoo.conf /etc/systemd/system/odoo.service':''),
'set -euo pipefail','','DIR="'+m.dir+'"','CONF="'+(sys?'/etc/odoo.conf':'$DIR/odoo.conf')+'"');
const d=deps(m);
a('','# '+(sys?'Build dependencies':'Build dependencies need an administrator; ask them to run:'));
if(sys)a(...d);else a(...d.map(x=>'#   '+x));
a('','# Python check','PY='+PY,'command -v "$PY" >/dev/null || { echo "$PY not found" >&2; exit 1; }',
'"$PY" -c \'import sys; sys.exit(sys.version_info < ('+m.minpy.join(', ')+'))\' || { echo "Odoo '+s.v+' needs Python '+mp+' or newer" >&2; exit 1; }');
a('','# Folders'+(sys?' and service user':''),S+'mkdir -p "$DIR"');
if(sys)a('id -u '+m.user+' >/dev/null 2>&1 || sudo useradd -r -d "$DIR" -s /bin/bash -U '+m.user,'sudo chown '+m.user+':'+m.user+' "$DIR"');
a('','# Get Odoo and its Python packages','if [ ! -d "$DIR/odoo/.git" ]; then','  getent hosts '+host+' >/dev/null || { echo "Cannot resolve '+host+': check your DNS or network, or set a mirror in the Git URL field" >&2; exit 1; }','  for i in 1 2 3; do','    '+AS+'git clone '+(s.shallow?'--depth 1 ':'')+'--branch '+m.branch+' '+m.repo+' "$DIR/odoo" && break','    echo "git clone failed (attempt $i of 3)" >&2; '+AS+'rm -rf "$DIR/odoo"; sleep 3','  done','  [ -d "$DIR/odoo/.git" ] || { echo "Could not clone Odoo" >&2; exit 1; }','fi',
AS+'"$PY" -m venv "$DIR/venv"',AS+'"$DIR/venv/bin/pip" install --upgrade pip wheel setuptools',AS+'"$DIR/venv/bin/pip" install -r "$DIR/odoo/requirements.txt"',AS+'mkdir -p "$DIR/custom-addons"');
if(s.rtl)a('',sys?'sudo npm install -g rtlcss':'npm install -g --prefix "$HOME/.local" rtlcss  # make sure ~/.local/bin is in your PATH');
a('','# Configuration (the master password is generated here and stays in the config file)',
'DBUSER='+(sys?m.user:'"$(id -un)"'),'ADMIN_PW="$(openssl rand -base64 18)"','if '+S+'test ! -f "$CONF"; then',
'  '+S+'tee "$CONF" >/dev/null <<EOF','[options]','admin_passwd = $ADMIN_PW','db_host = False','db_port = False','db_user = $DBUSER','db_password = False',
'addons_path = $DIR/odoo/addons,$DIR/custom-addons','http_port = '+m.port,'workers = '+m.workers,'proxy_mode = '+(s.proxy?'True':'False'),'list_db = '+(s.listdb?'True':'False'),'EOF','fi');
a(sys?'sudo chown '+m.user+':'+m.user+' "$CONF" && sudo chmod 640 "$CONF"':'chmod 600 "$CONF"');
if(m.db)a('','# Create the first database (no demo data)',AS+'"$DIR/venv/bin/python" "$DIR/odoo/odoo-bin" -c "$CONF" -d '+m.db+' -i base --without-demo=all --stop-after-init');
if(sys&&s.svc)a('','# systemd service','sudo tee /etc/systemd/system/odoo.service >/dev/null <<EOF','[Unit]','Description=Odoo '+s.v,'After=network.target postgresql.service','[Service]','Type=simple','User='+m.user,'Group='+m.user,
'ExecStart=$DIR/venv/bin/python $DIR/odoo/odoo-bin -c $CONF','Restart=on-failure','[Install]','WantedBy=multi-user.target','EOF','sudo systemctl daemon-reload','sudo systemctl enable --now odoo');
a('','echo "Odoo '+s.v+' is installed in $DIR (config: $CONF)."');
if(sys&&s.svc)a('echo "It listens on port '+m.port+'. Logs: journalctl -u odoo -f"');
else a('echo "Start it with: '+(sys?'sudo -u '+m.user+' ':'')+'$DIR/venv/bin/python $DIR/odoo/odoo-bin -c $CONF"','echo "It listens on port '+m.port+'."');
a('echo "Master password: '+(sys?'sudo ':'')+'grep admin_passwd $CONF"');
return L.join('\n')}
function fish(s){
const m=model(s),S=m.sys?'sudo ':'',L=[],a=(...x)=>L.push(...x),url='http://localhost:'+m.port;
a('# Odoo '+s.v+' helpers for fish. Save as ~/.config/fish/conf.d/odoo.fish','# (fish loads it in new sessions) or load it now with: source odoo.fish','');
if(m.sys&&s.svc){
a('function odoo-start --description "Start Odoo"','    sudo systemctl start odoo; and echo "Odoo is starting: '+url+'"','end','',
'function odoo-stop --description "Stop Odoo"','    sudo systemctl stop odoo; and echo "Odoo stopped"','end','',
'function odoo-restart --description "Restart Odoo"','    sudo systemctl restart odoo; and echo "Odoo restarted: '+url+'"','end','',
'function odoo-status --description "Show the Odoo service status"','    systemctl status odoo --no-pager','end','',
'function odoo-logs --description "Follow the Odoo logs"','    journalctl -u odoo -f','end')}
else{
const run=(m.sys?'sudo -u '+m.user+' -H ':'')+'nohup $ODOO_DIR/venv/bin/python $ODOO_DIR/odoo/odoo-bin -c $ODOO_CONF --logfile $ODOO_DIR/odoo.log';
a('set -g ODOO_DIR "'+m.dir+'"','set -g ODOO_CONF "'+(m.sys?'/etc/odoo.conf':m.dir+'/odoo.conf')+'"','',
'function odoo-status --description "Show whether Odoo is running"','    if pgrep -f "odoo-bin -c $ODOO_CONF" >/dev/null','        echo "Odoo is running ('+url+')"','    else','        echo "Odoo is stopped"; return 1','    end','end','',
'function odoo-start --description "Start Odoo in the background"','    if odoo-status >/dev/null','        echo "Odoo is already running"; return 0','    end','    '+run+' </dev/null >/dev/null 2>&1 &','    disown','    echo "Odoo is starting: '+url+' (log: $ODOO_DIR/odoo.log)"','end','',
'function odoo-stop --description "Stop Odoo"','    '+S+'pkill -f "odoo-bin -c $ODOO_CONF"; and echo "Odoo stopped"','end','',
'function odoo-restart --description "Restart Odoo"','    odoo-stop; sleep 2; odoo-start','end','',
'function odoo-logs --description "Follow the Odoo log"','    tail -f $ODOO_DIR/odoo.log','end')}
return L.join('\n')}
function purge(s){
const m=model(s),sys=m.sys,S=sys?'sudo ':'',PS=sys?'sudo -u postgres ':'',L=[],a=(...x)=>L.push(...x),todo=[];
const names=(s.pdbs||'').split(/\s+/).filter(x=>/^[\w.-]+$/.test(x)),conf=sys?'/etc/odoo.conf':'$DIR/odoo.conf';
todo.push('stop Odoo'+(sys&&s.svc?' and remove its systemd service':''));
if(s.ppdb)todo.push(names.length?'DROP the databases: '+names.join(' '):sys?'DROP every database owned by the '+m.user+' role':'drop no database (no names given)');
if(sys&&s.prole)todo.push('drop the PostgreSQL role '+m.user);
if(s.prtl)todo.push('uninstall rtlcss');
if(s.pkeep)todo.push('save custom-addons to a backup folder in your home first');
todo.push('delete $DIR (source code, virtualenv'+(sys?'':', config')+')');
if(sys)todo.push('delete /etc/odoo.conf');
if(!sys&&s.pfs)todo.push('delete ~/.local/share/Odoo (filestore and sessions)');
if(sys&&s.puser)todo.push('remove the system user '+m.user);
if(sys&&s.ppg)todo.push('REMOVE POSTGRESQL AND ALL ITS DATABASES, not only the Odoo ones');
a('#!/usr/bin/env bash','# Removes an Odoo '+s.v+' installation made by build-odoo-from-source. This cannot be undone.','# Build dependencies and wkhtmltopdf stay installed: other software may use them.','set -euo pipefail','','DIR="'+m.dir+'"','CONF="'+conf+'"',
'case "$DIR" in ""|"/"|"$HOME") echo "Refusing to remove $DIR" >&2; exit 1;; esac','','echo "This will permanently:"',...todo.map(t=>'echo "  - '+t+'"'),
'read -r -p "Type \'purge odoo\' to continue: " ANSWER','[ "$ANSWER" = "purge odoo" ] || { echo "Aborted."; exit 1; }','','# Stop Odoo');
if(sys&&s.svc)a('sudo systemctl disable --now odoo || true','sudo rm -f /etc/systemd/system/odoo.service','sudo systemctl daemon-reload');
a(S+'pkill -f "odoo-bin -c $CONF" || true');
if(s.ppdb){a('','# Drop databases');
if(names.length)names.forEach(n=>a(PS+'dropdb --if-exists '+n));
else if(sys)a('for db in $(sudo -u postgres psql -Atc "SELECT datname FROM pg_database WHERE datdba = (SELECT oid FROM pg_roles WHERE rolname = \''+m.user+'\')"); do','    sudo -u postgres dropdb "$db"','done')}
if(sys&&s.prole)a('','sudo -u postgres dropuser --if-exists '+m.user+' || echo "Could not drop the role: it still owns objects"');
if(s.prtl)a('',sys?'sudo npm uninstall -g rtlcss || true':'npm uninstall -g --prefix "$HOME/.local" rtlcss || true');
if(s.pkeep)a('','if [ -d "$DIR/custom-addons" ]; then','    BK="$HOME/odoo-custom-addons.$(date +%Y%m%d-%H%M%S)"','    '+S+'mv "$DIR/custom-addons" "$BK"',...(sys?['    sudo chown -R "$(id -un):" "$BK"']:[]),'    echo "Custom addons saved to $BK"','fi');
a('','# Remove files',S+'rm -rf "$DIR"');
if(sys)a('sudo rm -f "$CONF"');
if(!sys&&s.pfs)a('rm -rf "$HOME/.local/share/Odoo"');
if(sys&&s.puser)a('sudo userdel '+m.user+' || true');
if(sys&&s.ppg){const pm=m.o.pm;a('','# Remove PostgreSQL');
if(pm==='apt')a("sudo apt-get purge -y 'postgresql*'",'sudo apt-get autoremove -y','sudo rm -rf /var/lib/postgresql /etc/postgresql');
else if(pm==='dnf')a('sudo systemctl disable --now postgresql || true','sudo dnf -y remove postgresql-server postgresql-contrib','sudo rm -rf /var/lib/pgsql');
else a('sudo systemctl disable --now postgresql || true','sudo pacman -Rns --noconfirm postgresql','sudo rm -rf /var/lib/postgres')}
a('','echo "Odoo has been removed."');
return L.join('\n')}
const OUT={install:s=>({text:gen(s),name:'build-odoo-'+s.v+'-'+s.os+'.sh'}),fish:s=>({text:fish(s),name:'odoo.fish'}),purge:s=>({text:purge(s),name:'purge-odoo-'+s.v+'-'+s.os+'.sh'})};
/* UI */
const $=q=>document.querySelector(q),esc=t=>t.replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;');
const seg=(k,o)=>'<div class="seg" role="group">'+o.map(([v,l])=>'<button type="button" data-k="'+k+'" data-v="'+v+'">'+l+'</button>').join('')+'</div>';
const tg=t=>'<label class="tg" data-t="'+t[0]+'"><input type="checkbox" data-k="'+t[0]+'"><span>'+t[1]+'</span><small>'+t[2]+'</small></label>';
const fld=(k,l,ph)=>'<label class="fld" data-f="'+k+'"><span>'+l+'</span><input data-k="'+k+'" placeholder="'+esc(ph)+'" autocomplete="off" spellcheck="false"></label>';
$('#ctl').innerHTML='<h2>Odoo version</h2>'+seg('v',VERS.map(v=>[v,v]))+'<h2>Linux distribution</h2>'+seg('os',Object.entries(OS).map(([k,v])=>[k,v.n]))
+'<h2>Install for</h2>'+seg('mode',[['system','Everyone (sudo)'],['user','Just me (no sudo)']])+'<div id="nts"></div>'
+'<h2>Options</h2>'+TG.map(tg).join('')+'<h2>Settings</h2>'+fld('port','HTTP port','8069')+fld('dir','Install folder','/opt/odoo')+fld('user','Service user','odoo')+fld('db','First database name (optional)','e.g. mycompany')
+'<div id="pgrp"><h2>Purge options</h2>'+PTG.map(tg).join('')+fld('pdbs','Databases to drop (space-separated)','e.g. mycompany')+'</div><details><summary>Advanced</summary>'+fld('repo','Git URL (mirror)','https://github.com/odoo/odoo.git')+fld('branch','Git branch or tag','same as version')+fld('workers','Workers (0 = single process)','0')+ADV.map(tg).join('')+'</details>';
function sync(){
document.querySelectorAll('button[data-k]').forEach(b=>b.setAttribute('aria-pressed',st[b.dataset.k]===b.dataset.v));
document.querySelectorAll('input[type=checkbox]').forEach(c=>c.checked=!!st[c.dataset.k]);
document.querySelectorAll('input:not([type])').forEach(i=>{if(i!==document.activeElement)i.value=st[i.dataset.k]});
[...TG,...PTG].forEach(t=>{if(t[3])document.querySelector('[data-t='+t[0]+']').hidden=!t[3](st)});
document.querySelector('[data-f=user]').hidden=st.mode!=='system';
const m=model(st);$('#dir').placeholder=m.sys?'/opt/odoo':'~/odoo';
$('#nts').innerHTML=notes(m).map(n=>'<p class="note">'+esc(n)+'</p>').join('');
const out=OUT[st.tab](st);$('#code').textContent=out.text;$('#fn').textContent=out.name;document.querySelectorAll('[role=tab]').forEach(b=>b.setAttribute('aria-selected',b.dataset.tab===st.tab));$('#pgrp').hidden=st.tab!=='purge';
const q=new URLSearchParams();for(const k in D)if(st[k]!==D[k])q.set(k,typeof D[k]==='number'?(st[k]?'1':'0'):st[k]);
try{history.replaceState(null,'',location.pathname+(q.toString()?'?'+q:''))}catch(e){}}
document.querySelectorAll('input:not([type])').forEach(i=>{if(i.dataset.k==='dir')i.id='dir'});
$('#ctl').addEventListener('click',e=>{const b=e.target.closest('button[data-k]');if(b){st[b.dataset.k]=b.dataset.v;sync()}});
$('#ctl').addEventListener('input',e=>{const i=e.target,k=i.dataset.k;if(!k)return;st[k]=i.type==='checkbox'?(i.checked?1:0):i.value;sync()});
const live=t=>{$('#live').textContent=t;setTimeout(()=>$('#live').textContent='',2000)};
const flash=(b,t)=>{const o=b.textContent;b.textContent=t;setTimeout(()=>b.textContent=o,1800)};
const copy=async(b,t,msg)=>{try{await navigator.clipboard.writeText(t);flash(b,msg);live(msg)}catch(e){flash(b,'Copy failed')}};
$('#cp').onclick=e=>copy(e.target,$('#code').textContent,'Copied!');
$('#share').onclick=e=>copy(e.target,location.href,'Link copied!');
$('#dl').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([$('#code').textContent+'\n'],{type:'text/x-shellscript'}));a.download=$('#fn').textContent;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};
$('.tabs').addEventListener('click',e=>{const b=e.target.closest('[data-tab]');if(b){st.tab=b.dataset.tab;sync()}});
sync();
