import { PathLike, readFileSync } from "fs";
import { env } from "process";


export function envInit(key: string, value: string) {
	env[key] = value
}
export function mapInit(storage: Map<string, string>) {
	return (key: string, value: string) => {
		storage.set(`.${key}`, value)
	}
}
export function logInit() {
}
export function run(cb: (key: string, value: string) => void, _file: PathLike) {
	let dump
	let key, value
	let fileContent = readFileSync(_file).toString()
	let splitContent = fileContent.split("\n")

	for (const eachKey of splitContent) {
		dump = eachKey.trim()
		if (!dump) continue
		[key, value] = dump.split("=")
		cb(key.trim(), value.trim())
	}
}
