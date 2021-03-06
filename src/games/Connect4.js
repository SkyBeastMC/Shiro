import { createCanvas, loadImage } from 'canvas'
import { join } from 'path'
import * as embed from '../embed'

const imgDir = join(__dirname, '../img')
const images = (async () => {
	const frame = await loadImage(join(imgDir, 'c4frame.png'))
	const red = await loadImage(join(imgDir, 'c4red.png'))
	const yellow = await loadImage(join(imgDir, 'c4yellow.png'))
	return { frame, red, yellow }
})()

const emojis = ['🔴', '💛']

export default class Connect4 {
	constructor(module) {
		this.module = module
		this.migi = module.migi

		this.board = []
		for (let i = 0; i < 7; i++) this.board[i] = Array(6).fill(null)
	}

	static get nPlayers() {
		return 2
	}

	start(players, channel) {
		this.players = players
		this.channel = channel
		this.turn = 1
		return this.nTurn()
	}

	async nTurn() {
		await this.displayBoard(`${emojis[this.turn]} ${this.players[this.turn]}'s turn`)

		const player = this.players[this.turn]

		const x = await this.response(player)

		let y = 5
		while (this.board[x][y] !== null) y--

		this.board[x][y] = this.turn

		if (this.winCheck(x, y))
			return this.displayBoard(`${this.players[this.turn]} won!`).then(
				() => this.players[this.turn]
			) // return who won

		if (this.drawCheck())
			return this.displayBoard(`This is a draw! Nobody wins!`).then(() => null) // nobody wins

		this.turn = (this.turn + 1) % 2
		return this.nTurn()
	}

	response(player) {
		return new Promise((resolve, reject) => {
			const handler = ({ channel, author, content }) => {
				if (channel.id !== this.channel.id || author.id !== player.id) return

				if (!/^\d$/.exec(content) || content < 1 || content > 7)
					return channel.send(
						embed.err('Please send an integer between 1 and 7.')
					)

				if (this.board[content - 1][0] !== null)
					return channel.send(embed.err('This column is full!'))

				this.migi.removeListener('message', handler)
				resolve(content - 1)
			}

			this.migi.on('message', handler)
		})
	}

	async displayBoard(message) {
		const canvas = createCanvas(330, 286)
		const ctx = canvas.getContext('2d')
		const { frame, red, yellow } = await images

		const colors = [red, yellow]

		for (let i0 = 0; i0 < 7; i0++)
			for (let i1 = 0; i1 < 6; i1++)
				this.drawPiece(ctx, i0, i1, colors[this.board[i0][i1]])

		ctx.drawImage(frame, 0, 0, 330, 286)

		return this.channel.send(message, { file: canvas.toBuffer() })
	}

	drawPiece(ctx, x, y, image) {
		image && ctx.drawImage(image, 8 + 46 * x, 5 + Math.round(46.25 * y), 39, 39)
	}

	winCheck(x, y) {
		const get = (x, y) => this.board[x] && this.board[x][y]

		const check = getter => {
			let xx = 1
			for (let d = 1; d < 4; d++)
				if (getter(x, y, d) === this.turn) xx++
				else break

			for (let d = -1; d > -4; d--)
				if (getter(x, y, d) === this.turn) xx++
				else break

			return xx >= 4
		}

		return (
			check((x, y, d) => get(x + d, y + 0)) ||
			check((x, y, d) => get(x + 0, y + d)) ||
			check((x, y, d) => get(x + d, y + d)) ||
			check((x, y, d) => get(x - d, y + d))
		)
	}

	drawCheck() {
		return !this.board.some(arr => arr.some(p => p === null))
	}
}
