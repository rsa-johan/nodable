import path from "path"
import fs, { PathLike } from 'fs'
import { argv0 } from "process"

export function isUndefined(val: unknown): val is undefined {
	return val === undefined
}

export function walk(dir: PathLike, cb: (filePath: PathLike, files: PathLike) => void, predir = '/') {
	fs.readdir(dir, (_e: NodeJS.ErrnoException | null, items: string[]) => {
		for (const item of items) {
			let itemPath = path.join(dir as string, item)
			fs.stat(itemPath, (__e, stats) => {
				if (stats.isDirectory()) walk(itemPath, cb, predir + item + '/')
				else cb(itemPath, predir + item)
			})
		}
	})
}


export function eqZip(len: number, ...arr: Array<Array<any>>) {
	let items: any[] = []
	let index = 0

	for (const el of arr) {
		if (el.length !== len) throw new Error("Unzippable: Array not of given size!")
	}

	function next() {
		items = []
		for (const el of arr) {
			items.push(el[index])
		}

		index += 1
	}

	function forEach(cb: (...arr: Array<any>) => void) {
		next()
		while (index > 0) {
			cb(...items)
			next()
			if (index > len) break
		}
	}

	return {
		forEach
	}
}
