import { IncomingMessage, ServerResponse, createServer } from 'http'
import { PathLike, existsSync, lstatSync, readFileSync } from 'fs'
import { Callback, ContextState, HTTPMethods, pkey } from './types'
import { isUndefined, walk, eqZip } from './utils'
import { envInit, mapInit, run } from './dotenv'
import { Context } from './context'
import { parse } from 'path'

export class App {
	private serverClass: unknown
	private basePath: pkey
	private pathDef: Map<pkey, Array<ContextState<Context>>>
	private pathMap: Map<string, string>

	constructor() {
		this.pathDef = new Map<pkey, Array<ContextState<Context>>>()
		this.pathMap = new Map<string, string>()
		this.basePath = ""

		this.init()
	}

	private init() {
		let functions = [envInit, mapInit(this.pathMap)]
		let files = ['.env', 'paths.map']

		let zipped = eqZip(functions.length, functions, files)

		zipped.forEach((func, filename) => {
			run(func, filename)
		})
	}

	private useRouter() {
		let routes = (this.serverClass as { [_K: string]: Array<App> })["routes"]
		let app: App

		for (const route of routes) {
			app = route as App
			this.use(app.basePath, app)
		}
	}

	private use(paths: pkey, application: App) {
		let url, method

		if (paths === paths.toString()) {
			for (const exPath of application.pathDef.keys()) {
				[url, method] = (exPath as string).split(":")
				if (!isUndefined(application.pathDef.get(exPath)))
					this.set(`${paths}${url}`, application.pathDef.get(exPath), method)
			}
		} else {
			for (const pathname of paths) {
				for (const exPath of application.pathDef.keys()) {
					[url, method] = (exPath as string).split(":")
					if (!isUndefined(application.pathDef.get(exPath)))
						this.set(`${pathname}${url}`, application.pathDef.get(exPath), method)
				}
			}
		}
	}

	private static() {
		let dirname: string = (this.serverClass as { [_K: string]: string })["staticPath"]
		if (!dirname) return
		if (!existsSync(dirname) || !lstatSync(dirname).isDirectory()) return

		let cb = (filePath: PathLike, filename: PathLike) => {
			this.pathDef.set(`${filename}:GET`, [(ctx: Context) => {
				let key = "Content-Type"
				let value = this.pathMap.get(parse(filename as string).ext)

				if (!value) throw new Error("Not supported static files")

				ctx.setHeaders(key, value)
				ctx.send(readFileSync(filePath).toString())
			}])
		}

		walk(dirname, cb)
	}

	private set(path: string, pathListener: ContextState<Context>): void;
	private set(path: string, pathListener: Array<ContextState<Context>>): void;
	private set(path: string, pathListener: ContextState<Context>, method: HTTPMethods): void;
	private set(path: string, pathListener: Array<ContextState<Context>>, method: HTTPMethods): void;
	private set(path: string, pathListener: ContextState<Context> | Array<ContextState<Context>>, method?: HTTPMethods) {
		if (!method) {
			const name = `${path}:middlelayers`
			if (pathListener instanceof Array) {
				if (!this.pathDef.get(name)) this.pathDef.set(name, pathListener)
				else this.pathDef.set(name, this.pathDef.get(name).concat(pathListener))
			} else {
				if (!this.pathDef.get(name)) this.pathDef.set(name, [pathListener])
				else this.pathDef.set(name, this.pathDef.get(name).concat(pathListener))
			}
		} else {
			const name = `${path}:${method}`
			if (pathListener instanceof Array) {
				if (!this.pathDef.get(name)) this.pathDef.set(name, pathListener)
				else this.pathDef.set(name, this.pathDef.get(name).concat(pathListener))
			} else {
				if (!this.pathDef.get(name)) this.pathDef.set(name, [pathListener])
				else this.pathDef.set(name, this.pathDef.get(name).concat(pathListener))
			}
		}
	}

	private exists(req: IncomingMessage, callback: Callback<Context>) {
		let status = true
		let method: HTTPMethods = req.method as HTTPMethods
		let path: pkey = isUndefined(req.url) ? '/' : req.url
		let functionLayer = this.pathDef.get(`${path}:${method}`)
		let middleLayer = this.pathDef.get(`${path}:middlelayers`)
		if (!!middleLayer && middleLayer.length > 0) callback.callback.push(...middleLayer)
		if (!!functionLayer && functionLayer.length > 0) callback.callback.push(...functionLayer)
		else status = false

		callback.status = status
	}

	private app(req: IncomingMessage, res: ServerResponse<IncomingMessage>) {
		let cb: Callback<Context> = { status: true, callback: [] }
		this.exists(req, cb)
		let ctx = new Context(req, res)
		if (!cb.status) {
			ctx.sendError()
			return
		}

		for (let process of cb.callback) {
			process(ctx)
		}
	}

	GET(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "GET")
		}
	}
	POST(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "POST")
		}
	}
	PUT(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "PUT")
		}
	}
	DELETE(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "DELETE")
		}
	}
	PATCH(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "PATCH")
		}
	}
	HEAD(path: string) {
		return (method: any, _context: ClassMethodDecoratorContext) => {
			this.set(path, method, "HEAD")
		}
	}

	SERVER(Class: any, _context: ClassDecoratorContext) {
		this.serverClass = new Class()
		this.static()
		this.useRouter()
	}

	ROUTE(paths: pkey) {
		return (Class: any, _context: ClassDecoratorContext) => {
			this.serverClass = new Class()
			this.basePath = paths
		}
	}

	listen(port: number, cb: () => void) {
		const server = createServer((req, res) => {
			this.app(req, res)
		})

		server.listen(port, cb)
	}
}
