const http=require('http');const {Pool}=require('pg');
const port=Number(process.env.PORT||8080),schema=process.env.DB_SCHEMA,service=process.env.SERVICE_NAME||schema;
// PostgreSQL read/write connection pools.
// Writes always use the primary; ordinary reads use the streaming replica.
const legacyDbHost = process.env.DB_HOST || 'localhost';
const legacyDbPort = Number(process.env.DB_PORT || 5432);

const poolOptions = {
  database: process.env.DB_NAME || 'techlogix_lab',
  user: process.env.DB_USER || 'app_user',
  password: process.env.DB_PASSWORD,
  max: Number(process.env.DB_POOL_MAX || 10),
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  keepAlive: true,
};

const writePool = new Pool({
  ...poolOptions,
  host: process.env.DB_WRITE_HOST || legacyDbHost,
  port: Number(process.env.DB_WRITE_PORT || legacyDbPort),
  application_name: `${service}-write`,
});

const readPool = new Pool({
  ...poolOptions,
  host: process.env.DB_READ_HOST || process.env.DB_WRITE_HOST || legacyDbHost,
  port: Number(process.env.DB_READ_PORT || process.env.DB_WRITE_PORT || legacyDbPort),
  application_name: `${service}-read`,
});

writePool.on('error', (error) => {
  console.error(`[${service}] PostgreSQL write pool error:`, error.message);
});

readPool.on('error', (error) => {
  console.error(`[${service}] PostgreSQL read pool error:`, error.message);
});

// Verify that HAProxy sends writes to the primary and reads to the standby.
async function checkDatabase() {
  const [writeCheck, readCheck] = await Promise.all([
    writePool.query('SELECT pg_is_in_recovery() AS in_recovery'),
    readPool.query('SELECT pg_is_in_recovery() AS in_recovery'),
  ]);

  if (writeCheck.rows[0].in_recovery !== false) {
    throw new Error('Write database endpoint is not the PostgreSQL primary');
  }

  if (readCheck.rows[0].in_recovery !== true) {
    throw new Error('Read database endpoint is not the PostgreSQL replica');
  }
}

function send(res,status,data){res.writeHead(status,{'Content-Type':'application/json; charset=utf-8'});res.end(JSON.stringify(data))}
const server=http.createServer(async(req,res)=>{if(req.url==='/health'){try{await checkDatabase();return send(res,200,{service,status:'ok',database:'connected'})}catch(e){return send(res,503,{service,status:'unavailable',detail:e.message})}}
if(req.url==='/'||req.url.startsWith('/?')){if(req.method==='GET'){try{const requestUrl=new URL(req.url,'http://localhost');
const strongRead=requestUrl.searchParams.get('consistency')==='strong'||req.headers['x-read-consistency']==='strong';
const queryPool=strongRead?writePool:readPool;
const r=await queryPool.query(`SELECT id,name,created_at FROM ${schema}.items ORDER BY id DESC`);return send(res,200,{service,items:r.rows})}catch(e){return send(res,500,{error:'database query failed',detail:e.message})}}
if(req.method==='POST'){let raw='';req.on('data',c=>raw+=c);req.on('end',async()=>{try{const p=JSON.parse(raw||'{}');if(typeof p.name!=='string'||!p.name.trim())return send(res,400,{error:'name is required'});const r=await writePool.query(`INSERT INTO ${schema}.items(name) VALUES($1) RETURNING id,name,created_at`,[p.name.trim()]);return send(res,201,{service,item:r.rows[0]})}catch(e){return send(res,400,{error:'invalid request or database error',detail:e.message})}});return}}
return send(res,404,{error:'not found',service})});
server.listen(port,'0.0.0.0',()=>console.log(`${service} listening on ${port}; schema=${schema}`));
