/// <reference types="vite/client" />

declare module '*.svg' {
	const content: string
	export default content
}

// 添加 glob 的声明
interface ImportMeta {
	glob: (glob: string, options?: { eager?: boolean }) => Record<string, string>
}
