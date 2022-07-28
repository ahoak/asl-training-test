import vitePluginString from 'vite-plugin-string'

export default {
	plugins: [
		vitePluginString(
			{
				/* Default */
				include: [
					'src/**/*.html',
				],

				/* Default: undefined */
				exclude: 'node_modules/**',

				/* Default: true */
				// if true, using logic from rollup-plugin-glsl
				compress: false,

				// // if a function, will instead of default compress function
				// // returns string|Promise<string>
				// compress(code) {
				// 	return code.replace(/\n/g, '')
				// }
			})
	]
}
