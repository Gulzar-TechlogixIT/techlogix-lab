const http=require('http');const {Pool}=require('pg');
const port=Number(process.env.PORT||8080),schema=process.env.DB_SCHEMA,service=process.env.SERVICE_NAME||schema;
const pool=new Pool({host:process.env.DB_HOST||'localhost',port:Number(process.env.DB_PORT||5432),database:process.env.DB_NAME||'techlogix_lab',user:process.env.DB_USER||'app_user',password:process.env.DB_PASSWORD||'change_me_local'});
function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{if(req.url==='/health'){try{await pool.query('SELECT 1');return send(res,200,{service,status:'ok',database:'connected'})}catch(e){return send(res,503,{service,status:'unavailable',detail:e.message})}}
if(req.url==='/'||req.url.startsWith('/?')){if(req.method==='GET'){try{const r=await pool.query(`SELECT id,name,created_at FROM ${schema}.items ORDER BY id DESC`);return send(res,200,{service,items:r.rows})}catch(e){return send(res,500,{error:'database query failed',detail:e.message})}}
if(req.method==='POST'){let raw='';req.on('data',c=>raw+=c);req.on('end',async()=>{try{const p=JSON.parse(raw||'{}');if(typeof p.name!=='string'||!p.name.trim())return send(res,400,{error:'name is required'});const r=await pool.query(`INSERT INTO ${schema}.items(name) VALUES($1) RETURNING id,name,created_at`,[p.name.trim()]);return send(res,201,{service,item:r.rows[0]})}catch(e){return send(res,400,{error:'invalid request or database error',detail:e.message})}});return}}
return send(res,404,{error:'not found',service})});
server.listen(port,'0.0.0.0',()=>console.log(`${service} listening on ${port}; schema=${schema}`));
