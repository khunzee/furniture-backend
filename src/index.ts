import { af } from "@faker-js/faker/dist/airline-Dz1uGqgJ";
import {app} from "./views/app"

import "dotenv/config"

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
    console.log(`Server is at`)
} )
    