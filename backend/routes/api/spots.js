const express = require('express')

const { setTokenCookie, restoreUser, requireAuth } = require('../../utils/auth')
const { Spot, Review, SpotImage, User } = require('../../db/models')
const { validateAddSpot, validateUpdateSpot } = require('../../utils/validation')

const router = express.Router();


//Get all spots
router.get('/', async (req, res) => {

  const spots = await Spot.findAll({
    include: [
      {model: Review},
      {model: SpotImage}
    ]
  })

  let listOfSpots = [];
  spots.forEach(spot => {
    const spotJson = spot.toJSON()

     //getting the average rating
     let total = 0;
     if (spot.Reviews && spot.Reviews.length > 0){
      spotJson.Reviews.forEach((star) => {
        total += star.stars
      })

      const avg = total / spotJson.Reviews.length
      spotJson.avgRating = avg
     } else {
      spotJson.avgRating = 'Be the first to review this place!'
     }


    //getting the image preview link
    if(spotJson.SpotImages[0]){
      spotJson.previewImage = spot.SpotImages[0].url
    } else {
      spotJson.previewImage = 'No Image Preview...'
    }

    delete spotJson.SpotImages;
    delete spotJson.Reviews;

    listOfSpots.push(spotJson);
  })

  // console.log(spots)

  const allSpots = { Spots: listOfSpots}
  res.json(
    // spots,
    allSpots
  );
})

// Get Spots owned by current User
router.get('/current', requireAuth, async (req, res) => {
    const spots = await Spot.findAll({
      where: { ownerId: req.user.id},
      include: [
        {model: Review},
        {model: SpotImage}
      ]
    })

    let listOfSpots = [];
    spots.forEach(spot => {
      const spotJson = spot.toJSON()

       //getting the average rating
       let total = 0;
       if (spot.Reviews && spot.Reviews.length > 0){
        spotJson.Reviews.forEach((star) => {
          total += star.stars
        })

        const avg = total / spotJson.Reviews.length
        spotJson.avgRating = avg
       } else {
        spotJson.avgRating = 'Be the first to review this place!'
       }


      //getting the image preview link
      if(spotJson.SpotImages[0]){
        spotJson.previewImage = spot.SpotImages[0].url
      } else {
        spotJson.previewImage = 'No Image Preview...'
      }

      delete spotJson.SpotImages;
      delete spotJson.Reviews;

      listOfSpots.push(spotJson);
    })

    const allSpots = { Spots: listOfSpots }
    res.json(allSpots)
})

//Get Spots from an id
router.get('/:spotId', async (req, res) => {
  const spotId = req.params.spotId

  const spotsById = await Spot.findAll({
    where: { id: spotId },
    include: [
     {
      model: SpotImage ,
      attributes: ['id', 'url', 'preview']
    },
     {
      model: User,
      as: 'Owner',
      attributes: ['id', 'firstName', 'lastName']
     },
     { model: Review }
    ]
  })

  if(spotsById.length === 0){
    res.status(400);
    return res.json({
      message: "Specified spot does not exist..."
    })
  }

  let listOfSpots = [];

    spotsById.forEach(spot => {
      const spotJson = spot.toJSON()

      let total = 0;

       spotJson.Reviews.forEach((star) => {
         total += star.stars
       })

       const avg = spotJson.Reviews.length > 0 ? total / spotJson.Reviews.length : 'Be the first to review this place!'

      const payload = {
        id: spotJson.id,
        ownerId: spotJson.Owner.id,
        address: spotJson.address,
        city: spotJson.city,
        state: spotJson.state,
        country: spotJson.country,
        lat: spotJson.lat,
        lng: spotJson.lng,
        name: spotJson.name,
        description: spotJson.description,
        price: spotJson.price,
        createdAt: spotJson.createdAt,
        updatedAt: spotJson.updatedAt,
        //length of the reviews
        numReviews: spotJson.Reviews.length,
        avgStarRating: avg,
        SpotImages: spotJson.SpotImages,
        Owner: {
          id: spotJson.Owner.id,
          firstName: spotJson.Owner.firstName,
          lastName: spotJson.Owner.lastName
        }

      }

      delete spotJson.Reviews;

      listOfSpots.push(payload);
    })

    const allSpots = { Spots: listOfSpots }
    res.json(allSpots)
})

// Create a Spot
router.post('/', requireAuth, validateAddSpot, async (req, res, next) => {
  let { address, city, state, country, lat, lng, name, description, price } = req.body;

  const createSpot = await Spot.create({
    ownerId: req.user.id,
    address,
    city,
    state,
    country,
    lat,
    lng,
    name,
    description,
    price
  })

  res.status(201)
  return res.json(createSpot)
})

// Add Image to a Spot by Spot id !COME BACK TO THIS!
router.post('/:spotId/images', requireAuth, async (req, res, next) => {
  const spotId = req.params.spotId
  const spot = await Spot.findByPk(spotId)
  const { url, preview } = req.body

  if (!spot){
    res.status(404)
    return res.json({
      message: "Spot couldn't be found"
    })
  }

  if (req.user.id === spot.ownerId){
    const newImage = await SpotImage.create({
      url,
      preview
    })

    await spot.addSpotImages(newImage)

    res.json({
      id: newImage.id,
      url: newImage.url,
      preview: newImage.preview
    })
  } else {
    res.status(403)
    return res.json({
      message: 'You do not own this location...'
    })
  }

})

//Edit a Spot
router.put('/:spotId', validateUpdateSpot, requireAuth, async (req, res, next) => {
  const spotId = req.params.spotId;
  const spot = await Spot.findByPk(spotId);
  let { address, city, state, country, lat, lng, name, description, price } = req.body;

  if (!spot){
    res.status(404)
    return res.json({
      message: "Spot couldn't be found"
    })
  }

  if(req.user.id === spot.ownerId){
    if (address !== undefined) spot.address = address;
    if (city !== undefined) spot.city = city;
    if (state !== undefined) spot.state = state;
    if (country !== undefined) spot.country = country;
    if (lat !== undefined) spot.lat = lat;
    if (lng !== undefined) spot.lng = lng;
    if (name !== undefined) spot.name = name;
    if (description !== undefined) spot.description = description;
    if (price !== undefined) spot.price = price

    await spot.save()
    res.json(spot)
  } else {
    res.status(403)
    return res.json({
      message: 'You do not own this location...'
    })
  }

})














module.exports = router;
