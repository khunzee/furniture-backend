import crypto from "crypto";

export const generateOtp = () => {
  return (parseInt(crypto.randomBytes(3).toString("hex"), 16) % 100000)
    .toString()
    .padStart(5, "0");
};


export const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};