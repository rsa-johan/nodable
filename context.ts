import { IncomingMessage, ServerResponse } from "http";
import { PathLike, readFileSync } from "fs";
import { ContextBase, Cookies } from "./types";

export class Context {
	path: string
	host: string
	data: unknown
	misc: unknown
	_cookies: {
		[_K: string]: string
	}
	postableMethods: string[]

	private context: ContextBase
	constructor(req: IncomingMessage, res: ServerResponse<IncomingMessage>) {
		this.context = {
			request: req,
			response: res
		}
		this.postableMethods = [
			"POST",
			"PUT",
			"PATCH",
			"UPDATE",
		]

		this.path = this.host = ""
		this.misc = Object.create({})
		this._cookies = Object.create({})

		this.read()
		this.cookies()

		this.context.response.strictContentLength = true
	}

	send(body: string, header?: any) {
		if (!!header)
			for (const key of header) {
				this.context.response.setHeader(key, header[key])
			}

		this.context.response.write(body, err => {
			if (!!err) {
				console.error("Error: Response unwritable")
				return
			}

			this.context.response.end(() => { })
		})
	}

	serve(filename: PathLike) {
		let fileBody: Buffer | string = readFileSync(filename)
		let contentLength = fileBody.length
		fileBody = fileBody.toString()

		this.send(fileBody, {
			"Content-Type": "text/html",
			"Content-Length": contentLength
		})
	}

	setHeaders(key: string, value: string): void;
	setHeaders(key: { [_K: string]: string }): void;
	setHeaders(key: string | { [_K: string]: string } | any, value?: string) {
		let temp: string
		if (key === key.toString()) {
			if (!!key && !!value) {
				this.context.response.setHeader(key, value)
				return
			}
		} else {
			for (const _K in key as any) {
				temp = key[_K]
				this.context.response.setHeader(_K, temp)
			}
		}
	}

	setCookies(cookies: Cookies) {
		let ck = ""
		for (const cookie of cookies) {
			ck += `${cookie.key}=${cookie.value}`
			//need to add more
		}

		this.context.response.setHeader("set-cookie", ck)
	}

	headers() {
		return this.context.request.headers
	}

	private read() {
		if (!this.postableMethods.includes(this.context.request.method || "NONE")) return

		let body = ''

		this.context.request.on("data", (chunk) => {
			body += chunk
		})

		this.context.request.on("end", () => {
			this.processData(body)
		})
	}

	private processData(body: string) {
		let contentType = this.context.request.headers["content-type"]
		switch (contentType) {
			case "application/json":
				this.data = JSON.parse(body)
			default:
				throw new Error("Unsupported content type!")
		}
	}

	private cookies() {
		let key, value
		let cookies: unknown = this.context.request.headers.cookie

		if (!cookies || (cookies as string).length <= 0) return

		cookies = (cookies as string).split(";")

		for (const cookie of Array.from(cookies as string[])) {
			[key, value] = cookie.split("=")
			this._cookies[key] = value
		}
	}

	sendError() {
		this.context.response.writeHead(404, "Path not found!").end(() => { })
	}

}

