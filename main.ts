

const PORT = 8000;


/// helper functions 
//
//
// helpfer function to read html and css files from disk 
// returns a promise as the function is async 

async function readFile(filePath: string): Promise<string> {
  try {
    // returns string 
    return await Deno.readTextFile(filePath);
  } catch (error) {
    console.error(`Error reading ${filePath}:`, error);
    return `<h2>404 file not found: ${filePath}</h1>`;
  }
}

async function listFiles(dirPath: string): Promise<string[]> {
  const files: string[] = [];

  const currentDir = new URL(".", import.meta.url).pathname;
  const fullPath = `${currentDir}${dirPath}`;

  for await (const entry of Deno.readDir(fullPath)) {
    if(entry.isFile){
      files.push(entry.name);
    }
  }
  
  return files;
}
async function serveFile(filePath: string, contentType: string): Promise<Response> {
  try {
    const currentDir = new URL(".", import.meta.url).pathname;
    const fullPath = `${currentDir}${filePath}`;
    const content = await Deno.readTextFile(fullPath);
    return new Response(content, {
      headers: { "Content-Type": contentType }
    });
  } catch (error) {
    console.error(`Error serving ${filePath}:`, error.message);
    return new Response(`File not found: ${filePath}`, { 
      status: 404,
      headers: { "Content-Type": "text/plain" }
    });
  }
}


/// routes 
async function handleHomePage(): Promise<Response> {
  return await serveFile("./index.html", "text/html");
}


async function handleGetUsers(): Response {
  const users = [
    { id: 1, name: "Tanaka"},
    { id: 2, name: "James"},
  ];

  const htmlFragment = `
    <ul>
      ${users.map(user => `
      <li>
        <strong> ${user.id}</strong>: ${user.name}
        <button
          hx-delete="/api/users/${user.id}"
          hx-target="#user-list"
          hx-confirm="Delete ${user.name}?"
        >
          Delete 
        </button>
      </li>
      `).join('')}
    </ul>
    <p> users.length ${users.length}</p>
  `;

  return new Response(htmlFragment, {
    headers: {"Content-Type": "text/html"}
  });
}

async function handleDeleteUsers(userId: string): Response {
  return new Response(`
    <div>
      User ${userId} was deleted
    </div>
  `, {
      headers: {"Content-Type": "text/html"}
    });
}

async function handleStyles(): Promise<Response> {
  const css = await Deno.readTextFile("./styles.css");
  return new Response(css, {
    headers: {"Content-Type" : "text/css"}
  });
}

async function handleNotes(): Promise<Response> {
  const files = await listFiles("./notes");
  
  const htmlFragment = `<div>
    ${files.map(file => `<p>${file}
      <button 
        hx-get="/api/notes/${file}"        
        hx-target="#note-container"
        hx-swap="innerHTML"
        > load </button>
      </p>`).join('')}
  </div>`;

  return new Response(htmlFragment, {
    headers: {"Content-Type": "text/html"}
  });
}



async function router(req: Request): Promise<Response> {
  
  const url = new URL(req.url);
  const pathname = url.pathname;  // Gets: "/api/users"
  const method = req.method;      // Gets: "GET" "POST" etc 

  console.log(`${method} ${pathname}`);

  // route matching 
  if (pathname === "/" && method === "GET") {
    return await handleHomePage();
  }

  if (pathname === "/api/users" && method === "GET"){
    return handleGetUsers();
  }

  if (pathname === "/styles.css" && method === "GET"){
    return handleStyles();
  }

  if (pathname === "/api/notes" && method === "GET"){
    return handleNotes();
  }

  if (pathname.startsWith("/api/notes/") && method === "GET") {
    // Extract the filename from the URL
    const filename = pathname.replace("/api/notes/", "");
    if (filename) {
      return await serveFile(`./notes/${filename}`, "text/html");
    }
  }


  const deleteMatch = pathname.match(/^\/api\/users\/(\d+)$/);
  if (deleteMatch && method === "DELETE") {

    const userId = deleteMatch[1];
    return handleDeleteUsers(userId);
  }

  return new Response("<h1> 404 - Page Not Found </h1>", {
    status: 404,
    headers: {"Content-Type": "text/html"}
  });
}


console.log(` server starting on http://localhost:${PORT}`);

const files = await listFiles("./notes");
console.log("Files in views folder:", files);

Deno.serve({port: PORT}, router);
