const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config()
const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

// const verifyJWT = (req,res,next)=>{
//   const authorization = req.headers.authorization;
//   if(!authorization){
//     return res.status(401).send({error:true,message: 'unauthorized access'})
//   }
//   const token = authorization.split(' ')[1];
//   jwt.verify(token,process.env.ACCESS_TOKEN_SECRET,(err,decoded)=>{
//     if(err){
//       return res.status(401).send({error:true,message:'unauthorized access'})
//     }
//     req.decoded=decoded;
//     next();
//   })
// }
const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res.status(401).send({ error: true, message: 'unauthorized access' });
  }
  // bearer token
  const token = authorization.split(' ')[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
    if (err) {
      return res.status(401).send({ error: true, message: 'unauthorized access' })
    }
    req.decoded = decoded;
    next();
  })
}



const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.sat5t4p.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();


    // database collention 
    const userCollections = client.db('yogaMeditation').collection('users');
    const classCollections = client.db('yogaMeditation').collection('addClass');
    const bookedClassCollections = client.db('yogaMeditation').collection('bookedClass');
    const paymentsClassCollections = client.db('yogaMeditation').collection('payments');



    // jwt token 
    app.post('/jwt', (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
      res.send({ token });
    })

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await usersCollections.findOne(query);
      if (user?.role !== 'admin') {
        return res.status(403).send({ error: true, message: 'forbidden message' });
      }
      next();
    }

    // user realeted api 
    app.post('/users', async (req, res) => {
      const user = req.body;
      const query = { email: user.email }
      const { password } = req.body;
      const existingUser = await userCollections.findOne(query);
      if (existingUser) {
        return res.send({ message: 'user Already Exist!' })
      }
      if (password !== req.body.confirmPassword) {
        return res.status(400).json({ message: 'Passwords do not match' });
      }

      const result = await userCollections.insertOne(user)
    })

    app.get('/users/admin/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await userCollections.findOne(query);
      const result = { admin: user?.role === 'admin' }
      res.send(result);

    });

    app.get('/users/instructor/:email', verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false })
      }
      const query = { email: email }
      const user = await userCollections.findOne(query);
      const result = { instructor: user?.role === 'instructor' }
      res.send(result);

    });

    app.get('/users-findUser/:email', async (req, res) => {
      const email = req.params.email;
      const query = { email: email }
      const result = await userCollections.findOne(query);
      res.send(result);
    })

    // status update api 
    app.patch('/class-statusChange/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'approved'
        }
      }
      const result = await classCollections.updateOne(filter, updateDoc);
      res.send(result);
    })

    app.patch('/class-statusDenied/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          status: 'denied'
        }
      }
      const result = await classCollections.updateOne(filter, updateDoc);
      res.send(result);
    })

    //all user fetch for admin 
    app.get('/allUser',verifyJWT, async (req, res) => {
      const result = await userCollections.find().toArray()
      res.send(result);
    });

    //make admin 
    app.patch('/users/admin/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'admin'
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    });

    // make instructor 
    app.patch('/users/instructor/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          role: 'instructor',
        },
      };
      const result = await userCollections.updateOne(filter, updateDoc);
      res.send(result);
    })

    // all instructor 
    app.get('/allInstructor', async (req, res) => {
      const query = { role: 'instructor' }
      const result = await userCollections.find(query).toArray()
      res.send(result);
    })
    // all class 
    app.get('/allClass/', async (req, res) => {
      const status = req.params.status;
      const result = await classCollections.find().toArray();
      res.send(result);

    })
    //Class item  apis
    app.post('/addClass', verifyJWT, async (req, res) => {
      const newItem = req.body;
      const result = await classCollections.insertOne(newItem)
      res.send(result);
    });

    app.get('/singleClass/:id', async (req, res) => {
      const id = req.params.id;
      console.log(id);
      const query = {_id: new ObjectId(id)};
      const result = await classCollections.findOne(query);
      res.send(result)
  })
    // update clase 

    app.put('/updateClass/:id',async(req,res)=>{
      const id = req.params.id;
      const options = { upsert: true };
      const filter={_id:new ObjectId(id)}
      const updateClass = req.body;
      const classes = {
        $set: {
          price: updateClass.price,
          seat: updateClass.seat,
          className: updateClass.className,
      }
      }
      const result = await classCollections.updateOne(filter, classes, options);
      res.send(result);
    })

    app.get('/allClassByInstructor', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      const query = { instructorEmail: email };
      const result = await classCollections.find(query).toArray();
      res.send(result);
    });

    //class booked api 
    app.post('/bookedClass', async (req, res) => {
      const item = req.body;
      const result = await bookedClassCollections.insertOne(item);
      res.send(result);
    })
    app.get('/allClassByStudent', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      const query = { studentEmail: email };
      const result = await bookedClassCollections.find(query).toArray();
      res.send(result);
    });
    // delete the student booked class 
    app.delete('/bookedClass/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await bookedClassCollections.deleteOne(query);
      res.send(result);
    });


    // class enrolled api 
    app.get('/allEnrolledClassBookedByStudent', verifyJWT, async (req, res) => {
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      const query = { email: email };
      const result = await paymentsClassCollections.find(query).toArray();
      res.send(result);

    });
    // total enrolled student 
    app.get('/totalEnrolledStudent',async(req,res)=>{
      const email = req.query.email;
      const query = { instructorEmail: email };
      const result = await paymentsClassCollections.find(query).toArray();
      res.send(result);
    })



    // create payment intent 
    app.post('/create-payment-intent', verifyJWT, async (req, res) => {
      const { price } = req.body;
      const amount = price * 100
      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount,
        currency: 'usd',
        payment_method_types: ['card']
      });
      res.send({
        clientSecret: paymentIntent.client_secret
      })
    });

    // payment related api 
    app.post('/payments', verifyJWT, async (req, res) => {
      const payment = req.body;
      const insertResult = await paymentsClassCollections.insertOne(payment);
      // const query = { _id: { $in: payment.cartItems.map(id => new ObjectId(id)) } };
      // const deleteResult = await bookedClassCollections.deleteMany(query);

      res.send({ insertResult });
    });
    // payment histroy api 
    app.get('payment/history',async(req,res)=>{
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }

      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      const query = { email: email };
      const result = await paymentsClassCollections.find(query).toArray();
      res.send(result);
    })


    app.get('/findSingleBook/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await bookedClassCollections.findOne(query);
      res.send(result);
    });

    app.put('/afterPaymentBooked/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          paid: 'paid',      
        },
      };
      const result = await bookedClassCollections.updateOne(filter, updateDoc)
      res.send(result);

    })

    app.put('/sendFeedBack/:id', async (req, res) => {
      const { feedback } = req.body;
      const id = req.params.id;
      console.log('id id ', req.params.id, feedback);
      const filter = { _id: new ObjectId(id) };
      const updateDoc = {
        $set: {
          feedback: feedback,
        },
      };
      const result = await classCollections.updateOne(filter, updateDoc);
      res.send(result);
    });
    



    // update seat value 
    app.put('/seatNumberIncrease/:id',async(req,res)=>{
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updateDoc = {
        $set: {
          seat: 'instructor',
        },
      };

    })
    
    // show popular class 
    app.get('/showPopularClass',async(req,res)=>{
      const query = {paid:'paid'};
      const result = await bookedClassCollections.find(query).toArray();
      res.send(result)
    })
    // show popular instructor 
    app.get('/showPopularInstructor',async(req,res)=>{
      const query = {paid:'paid'};
      const result = await bookedClassCollections.find(query).toArray();
      res.send(result)
    })



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/', (req, res) => {
  res.send('yoga is Running')
})
app.listen(port, () => {
  console.log(`Yoga meditation is on port ${port}`);
})