import { PathLike } from "fs"
import { ServerResponse, IncomingMessage } from "http"

export type pkey = string | string[]
export type HTTPMethods = "GET" | "POST" | "PUT" | "PATCH" | "DELETE" | "HEAD"

export type Callback<T> = {
	status: boolean,
	callback: Array<ContextState<T>>
}

export type ContextState<T> = (ctx: T) => void | Promise<void>

export type Cookie = {
	key: string,
	value: string | null,
	HTTPOnly?: boolean,
	Secure?: boolean,
	SameSite: "strict"
}
export type Cookies = Array<Cookie>

export type ContextBase = {
	request: IncomingMessage,
	response: ServerResponse<IncomingMessage>
}

export type Application<T> = {
	routes: Array<T>,
	staticPath: PathLike,
	log: PathLike
}
