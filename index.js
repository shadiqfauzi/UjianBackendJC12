const express = require('express')
const app = express()
const port = process.env.PORT || 2000
const cors = require('cors')
const { query, db } = require('./database')
const { uploader } = require('./helper/uploader')
const fs = require('fs')

app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(cors())
app.use(express.static('public'))

app.get('/', (req, res) => {
	res.status(200).send('<h1>Welcome to Ujian API</h1>')
})

app.get('/test', async (req, res) => {
	let sql = `select * from product`
	try {
		let results = await query(sql)
		res.status(200).send(results)
	} catch (err) {
		res.status(500).send(err.message)
	}
})

// ============= Product Routes =============
// Read Product
app.get(`/get-product`, async (req, res) => {
	let sql = `select * from product`
	try {
		let results = await query(sql)
		res.status(200).send({
			status: 'Success',
			data: results,
			message: `Fetch all product success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Create Product
app.post(`/add-product`, (req, res) => {
	let sql = `insert into product set ?`
	const path = '/images'
	const upload = uploader(path, 'PROD').fields([{ name: 'image' }])
	upload(req, res, async (err) => {
		if (err) {
			return res.status(500).send({
				status: 'Failed',
				message: err.message,
			})
		}
		const { image } = req.files
		const imagePath = image ? `${path}/${image[0].filename}` : null
		req.body.imagePath = imagePath
		let sql = `insert into product set ?`
		try {
			await query(sql, req.body)
			res.status(200).send({
				status: 'Created',
				message: `Add new product success`,
			})
		} catch (err) {
			fs.unlinkSync(`./public${imagePath}`)
			res.status(500).send({
				status: 'Failed',
				message: err.message,
			})
		}
	})
})

// Update Product
app.patch(`/edit-product/:id`, async (req, res) => {
	try {
		let sql = `select * from product where product_id = '${req.params.id}'`
		let results = await query(sql)
		let oldImagePath = results[0].imagePath

		// upload new image (doesnt matter if there is or not)
		const path = '/images'
		const upload = uploader(path, 'PROD').fields([{ name: 'image' }])
		upload(req, res, async (err) => {
			if (err) {
				res.status(500).send({
					status: 'Failed',
					message: err.message,
				})
			} else {
				const { image } = req.files
				// if there is a new image uploaded, change the old imagePath with the new one, if not then image path is the same as old image path
				const imagePath = image
					? `${path}/${image[0].filename}`
					: oldImagePath

				let { nama, harga } = req.body
				let sql = `update product set nama = '${nama}', harga = ${parseInt(
					harga
				)}, imagePath = '${imagePath}' where product_id = '${
					req.params.id
				}'`
				try {
					await query(sql)
					sql = `select * from product where product_id = ${req.params.id}`
					let results = await query(sql)
					if (image) {
						fs.unlinkSync(`./public${oldImagePath}`)
					}
					res.status(200).send({
						status: 'Modified',
						data: results[0],
						message: 'Product successfully modified.',
					})
				} catch (err) {
					fs.unlinkSync(`./public${imagePath}`)
					res.status(500).send({
						status: 'Error',
						message: err.message,
					})
				}
			}
		})
	} catch (err) {
		res.status(500).send({
			status: 'Error',
			message: err.message,
		})
	}
})

// Delete Product
app.delete(`/delete-product/:id`, async (req, res) => {
	let sql = `select * from product where product_id = ${req.params.id}`
	try {
		let results = await query(sql)
		fs.unlinkSync(`./public${results[0].imagePath}`)
		sql = `select * from inventory where product_id = ${req.params.id}`
		let inventory = await query(sql)
		inventory.forEach(async (e) => {
			try {
				sql = `delete from inventory where inventory_id = ${e.inventory_id}`
				await query(sql)
			} catch (err) {
				res.status(500).send({
					status: 'Failed',
					message: err.message,
				})
			}
		})
		sql = `delete from product where product_id = ${req.params.id}`
		await query(sql)
		res.status(200).send({
			status: 'Deleted',
			message: 'Product successfully deleted.',
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// ============= Store Routes =============
// Read Store
app.get('/get-store', async (req, res) => {
	let sql = `select * from store`
	try {
		let results = await query(sql)
		res.status(200).send({
			status: 'Success',
			data: results,
			message: `Fetch all store success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Create Store
app.post('/add-store', async (req, res) => {
	let sql = `insert into store set ?`
	try {
		let insert = await query(sql, req.body)
		sql = `select * from store where store_id = ${insert.insertId}`
		let results = await query(sql)
		res.status(200).send({
			status: 'Success',
			data: results[0],
			message: `Add new store success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Update Store
app.patch('/edit-store/:id', async (req, res) => {
	let sql = `update store set ? where store_id = ${req.params.id}`
	try {
		await query(sql, req.body)
		let results = await query(
			`select * from store where store_id = ${req.params.id}`
		)
		res.status(200).send({
			status: 'Success',
			data: results[0],
			message: `Edit store success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Delete Store
app.delete(`/delete-store/:id`, async (req, res) => {
	const { id } = req.params
	let sql = `select * from inventory where store_id = ${id}`
	try {
		let inventory = await query(sql)
		inventory.forEach(async (e) => {
			try {
				sql = `delete from inventory where inventory_id = ${e.inventory_id}`
				await query(sql)
			} catch (err) {
				res.status(500).send({
					status: 'Failed',
					message: err.message,
				})
			}
		})
		sql = `delete from store where store_id = ${id}`
		await query(sql)
		res.status(200).send({
			status: 'Deleted',
			message: 'Store successfully deleted.',
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// =========== Inventory Route ============

let sqlInv = `
    select 
        i.inventory_id, 
        p.nama, 
        s.branch_name, 
        i.inventory 
        from inventory i 
    join product p on i.product_id = p.product_id 
    join store s on i.store_id = s.store_id
`

// Read Inventory
app.get('/get-inventory', async (req, res) => {
	let sqlStore = `select * from store`
	let sqlProduct = `select * from product`
	try {
		let inventory = await query(sqlInv + ` order by i.inventory_id asc`)
		let store = await query(sqlStore)
		let product = await query(sqlProduct)
		res.status(200).send({
			status: 'Success',
			data: {
				inventory,
				store,
				product,
			},
			message: `Fetch all inventory success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Create Inventory
app.post('/add-inventory', async (req, res) => {
	let sql = `insert into inventory set ?`
	try {
		let insert = await query(sql, req.body)
		let results = await query(
            sqlInv + `
            where inventory_id = ${insert.insertId}
            `
		)
		res.status(200).send({
			status: 'Success',
			data: results[0],
			message: `Add new inventory success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

// Update Inventory
app.patch('/edit-inventory/:id', async (req, res) => {
	let { id } = req.params
	let sql = `update inventory set ? where inventory_id = ${id}`
	try {
		await query(sql, req.body)
		let results = await query(sqlInv + ` where inventory_id = ${id}`)
		res.status(200).send({
			status: 'Success',
			data: results[0],
			message: `Edit inventory success`,
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

//Delete Inventory
app.delete('/delete-inventory/:id', async (req, res) => {
    sql = `delete from inventory where inventory_id = ${req.params.id}`
    try{
		await query(sql)
		res.status(200).send({
			status: 'Deleted',
			message: 'Inventory successfully deleted.',
		})
	} catch (err) {
		res.status(500).send({
			status: 'Failed',
			message: err.message,
		})
	}
})

app.listen(port, () => {
	console.log(`API Started`)
})
