const express = require('express');
const app = express();
const cors = require('cors');
var jwt = require('jsonwebtoken');
require('dotenv').config()

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



const { MongoClient, ServerApiVersion } = require('mongodb');
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



    // jwt token 
    app.post('/jwt',(req,res)=>{
        const user = req.body;
        const token = jwt.sign(user,process.env.ACCESS_TOKEN_SECRET,{expiresIn:'1h'})
        console.log(token,user);
        res.send({token});
    })

    app.post('/users',async(req,res)=>{
        const user =req.body;
        const query = {email:user.email}
        const {password} =req.body;
        const existingUser = await userCollections.findOne(query);
        if(existingUser){  
            return res.send({message: 'user Already Exist!'})
        }
        if (password !== req.body.confirmPassword) {
            return res.status(400).json({ message: 'Passwords do not match' });
          }
        
        const result = await userCollections.insertOne(user)
    })

    app.get('/users/admin/:email',verifyJWT, async(req,res)=>{
        const email = req.params.email;
        if(req.decoded.email !== email){
          res.send({admin:false})
        }
        const query = {email : email}
        const user = await userCollections.findOne(query);
        const result = {admin:user?.role === 'admin'}
        res.send(result);
        
    });
    app.get('/users/instructor/:email',verifyJWT, async(req,res)=>{
        const email = req.params.email;
        if(req.decoded.email !== email){
          res.send({admin:false})
        }
        const query = {email : email}
        const user = await userCollections.findOne(query);
        const result = {instructor:user?.role === 'instructor'}
        res.send(result);
        
    });
     
    // all instructor 
    app.get('/allInstructor',async(req,res)=>{
      const query = {role:'instructor'}
      const result = await userCollections.find(query).toArray()
      res.send(result);
    })

    // all class 
    app.get('/allClass',async(req,res)=>{
      const result = await classCollections.find().toArray();
      res.send(result);

    })


    //Class item  apis
    app.post('/addClass',verifyJWT,async(req,res)=>{
      const newItem = req.body;
      const result = await classCollections.insertOne(newItem)
      res.send(result);
    });

    app.get('/allClassByInstructor', verifyJWT, async(req,res)=>{
      const email = req.query.email;
      if (!email) {
        return res.send([]);
      }
    
      const decodedEmail = req.decoded.email;
    
      if (email !== decodedEmail) {
        return res.status(403).send({ error: true, message: 'Forbidden access' });
      }
      const query = { instructorEmail : email};
      const result = await classCollections.find(query).toArray();
      res.send(result);
    });

    // app.get('/allClass', verifyJWT, async (req, res) => {
    //   const email = req.query.email;
    
      // if (!email) {
      //   return res.send([]);
      // }
    
      // const decodedEmail = req.decoded.email;
    
      // if (email !== decodedEmail) {
      //   return res.status(403).send({ error: true, message: 'Forbidden access' });
      // }
    
    //   try {
    //     const query = { email: email };
    //     const result = await classCollections.find(query).toArray();
    //     console.log(result); // Log the retrieved data for debugging
    //     res.send(result);
    //   } catch (error) {
    //     console.error(error);
    //     res.status(500).send({ error: true, message: 'Internal Server Error' });
    //   }
    // });
    

    // cart collection apis
    // app.get('/allClass', verifyJWT, async (req, res) => {
    //   const email = req.query.email;

    //   if (!email) {
    //     res.send([]);
    //   }

    //   const decodedEmail = req.decoded.email;
    //   if (email !== decodedEmail) {
    //     return res.status(403).send({ error: true, message: 'Forbidden access' })
    //   }

    //   const query = { email: email };
    //   const result = await classCollections.find(query).toArray();
    //   res.send(result);
    // });



    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);



app.get('/',(req,res)=>{
    res.send('yoga is Running')
})
app.listen(port,()=>{
    console.log(`Yoga meditation is on port ${port}`);
})