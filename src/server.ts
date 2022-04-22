import * as lb from '@google-cloud/logging-bunyan'
import express from 'express'
import 'dotenv/config'
import cors from 'cors'
import hpp from 'hpp'
import helmet from 'helmet'
import fileUpload, { UploadedFile } from 'express-fileupload'
import { FileUpload, newId } from '@thetabox/model'
import { DateHelper } from '@thetabox/services'
import https from 'https'
import fs from 'fs'
import proxy from 'express-http-proxy'
process.env.GOOGLE_APPLICATION_CREDENTIALS = './key.json'

async function startServer() {
	const logName = 'thetabox_gateway'
	const { logger, mw } = await lb.express.middleware({
		logName: logName,
	})

	logger.info('start thetabox-gateway')
	console.log('start thetabox gateway')
	const app = express()
	const port = process.env.SERVER_PORT || 3333

	const httpsServer = https.createServer(
		{
			key: fs.readFileSync('./thetastreamer.com_key.pem'),
			cert: fs.readFileSync('./thetastreamer_com.pem'),
		},
		app
	)

	app.use(
		fileUpload({
			createParentPath: true,
			useTempFiles: true,
		})
	)

	app.use(mw)
	app.use(cors({ origin: true, credentials: false }))
	app.use(hpp())
	app.use(helmet.contentSecurityPolicy())
	app.use(helmet.crossOriginEmbedderPolicy())
	app.use(helmet.crossOriginOpenerPolicy())
	app.use(helmet.crossOriginResourcePolicy())
	app.use(helmet.dnsPrefetchControl())
	app.use(helmet.expectCt())
	app.use(helmet.frameguard())
	app.use(helmet.hidePoweredBy())
	app.use(helmet.hsts())
	app.use(helmet.ieNoOpen())
	app.use(helmet.noSniff())
	app.use(helmet.originAgentCluster())
	app.use(helmet.permittedCrossDomainPolicies())
	app.use(helmet.referrerPolicy())
	app.use(helmet.xssFilter())
	app.use(express.json())
	app.use(express.urlencoded({ extended: true }))
	app.use(
		'/proxy',
		proxy('localhost:8080', {
			proxyReqPathResolver: function (req) {
				return new Promise(function (resolve, reject) {
						var parts = req.url.split('?')
						var queryString = parts[1]
						var updatedPath = parts[0].replace(/test/, 'tent')
						var resolvedPathValue = updatedPath + (queryString ? '?' + queryString : '')
						console.log(resolvedPathValue)
						resolve(resolvedPathValue)
				})
			},
		})
	)

	app.get('', async (req, res) => {
		res.send('hello')
	})

	app.post('/api/uploads', async (req, res) => {
		try {
			if (!req.files) {
				res.send({
					status: false,
					message: 'No file uploaded',
				})
			} else {
				const file = req.files.file as UploadedFile
				const id = newId()
				const uploadFolder = process.env.UPLOAD_FOLDER || './uploads'
				const extensions = file.name.split('.')
				const extension = extensions[extensions.length - 1]
				const fileName = `${id}.${extension}`
				const fullPath = `${uploadFolder}/${fileName}`

				file.mv(fullPath)

				const gatewayUpload: FileUpload = {
					id,
					encoding: file.encoding,
					mimetype: file.mimetype,
					file_name: fileName,
					name: file.name,
					size: file.size,
					upload_time: DateHelper.dayInUnix(new Date()),
				}
				console.log(gatewayUpload)
				res.send(gatewayUpload)
			}
		} catch (err) {
			console.error(err)
			logger.error(err)
			res.status(500).send(err)
		}
	})

	httpsServer.listen(port, () => {
		logger.info(`App listening on the port ${port}`)
		console.log(`App listening on the port ${port}`)
	})
}

startServer()
