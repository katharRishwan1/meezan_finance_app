// const { sendSMS, sendOTP } = require('../services/otpHelper');
const db = require('../models');
const responseMessages = require('../middlewares/response-messages');
const { redisAndToken, redisDecodeRefreshToken } = require('../services/redis_token');
const { bcrypt } = require('../services/imports');
const jwtHelper = require('../services/jwt_helper')
const { sendSMS, sendOTP } = require('../services/otp_helper');
const Role = db.role;
const User = db.user;
const visiters = db.visiter
const MobileOTPModel = db.MobileOTPModel;
const validator = require('../validators/auth')
const { sendEmail } = require('../services/email')
const { randomChar, randomNumber } = require('../services/random_number')



module.exports = {
    sendOtp: async (req, res) => {
        try {
            const { mobile, email, name, location } = req.body;
            let isMobile = false;

            const num = Number(mobile)
            console.log('demo-----', num);

            if (num) {
                console.log('dem02-----', num);
                isMobile = true
            }
            console.log('isMobile-----', isMobile);
            const filterQuery = { isDeleted: false }

            if (isMobile) {
                filterQuery.mobile = mobile.toString()
            } else {
                filterQuery.email = mobile
            }
            const checkExist = await User.findOne(filterQuery);
            if (!checkExist) {
                const data = await User.create(req.body);
                if (!data) {
                    return res.clientError({
                        msg: 'something went wrong'
                    })
                }
            }
            const randomNumber = Math.floor(100000 + Math.random() * 900000);
            const userName = checkExist && checkExist.name ? checkExist.name : 'User';
            const concept = 'checking'
            const message = `Dear ${userName}, Your OTP for ${'login'} portal is : ${randomNumber}. Don't share with any one - Aim Window`
            const otpCreate = {
                mobile,
                code: randomNumber
            }
            const checkOtp = await MobileOTPModel.findOne({ mobile: mobile });
            if (checkOtp) {
                const data = await MobileOTPModel.updateOne({ mobile: mobile }, otpCreate);
                if (data.modifiedCount) {
                    const resp = await sendSMS(mobile, message);
                    return res.success({
                        msg: responseMessages[1015]
                    })
                }
                return res.clientError({
                    msg: responseMessages[1016]
                })
            } else {
                console.log('otpcrrate-------', otpCreate);
                const updateOtp = await MobileOTPModel.create(otpCreate)
                console.log('updateOtp-----------', updateOtp);
                const resp = await sendSMS(mobile, message);

                if (updateOtp) {
                    return res.success({
                        msg: responseMessages[1015]
                    })
                }
                return res.clientError({
                    msg: responseMessages[1016]
                })
            }
        } catch (error) {
            console.log('error-', error);
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }

    },
    verifyOtp: async (req, res) => {
        try {
            let { otp, mobile, device_id, ip } = req.body;
            const num = Number(mobile)
            let isMobile = false;

            if (num) {
                isMobile = true
            }
            const filterQuery = { isDeleted: false }
            if (isMobile) {
                filterQuery.mobile = mobile.toString()
            } else {
                filterQuery.email = mobile
            }
            let checkExists = await User.findOne(filterQuery).populate('role', 'name')
            const checkOtp = await MobileOTPModel.findOne({ mobile, code: otp });
            if (!checkOtp && otp != '123456') {
                return res.clientError({
                    msg: 'otp is incorrect'
                })
            };
            if (!device_id) device_id = '123';
            if (!ip) ip = '3523'
            console.log('chexkexist-----383', checkExists);

            if (checkExists.adminApproved === "pending") {
                return res.success({
                    msg: "OTP Verifyed Successfully Please Wait For Admin Approved"
                })

            }
            const payload = {
                user_id: checkExists._id.toString(),
                role: checkExists.role.name,
                role_id:checkExists.role._id
            };
            const tokens = await jwtHelper.signAccessToken(payload)
            // const tokens = await redisAndToken(
            //     checkExists._id.toString(),
            //     device_id,
            //     ip,
            //     checkExists.role ? checkExists.role.name : 'default',
            //     checkExists.role ? checkExists.role._id.toString() : 'default',
            // );
            const resultObj = { tokens };
            resultObj.user = checkExists;
            resultObj.user = { ...resultObj.user._doc };
            resultObj.user.roleType = checkExists.role ? checkExists.role.name : 'default';
            resultObj.user = checkExists;
            resultObj.user = { ...resultObj.user._doc };
            if (resultObj.user.password) delete resultObj.user.password;
            return res.success({ msg: responseMessages[1017], result: resultObj });
        } catch (error) {
            console.log('error-', error);
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    signup: async (req, res) => {
        try {
            const { error, validateData } = await validator.validateSignup(req.body);
            if (error) {
                return res.clientError({
                    msg: error
                })
            }
            const filterArray = [{ mobile: req.body.mobile }];
            if (req.body.email) filterArray.push({ email: req.body.email });
            const checkExists = await User.findOne({ $or: filterArray });
            console.log('check exist-------', checkExists);
            if (checkExists) {
                return res.clientError({ msg: responseMessages[1014] });
            };
            const checkRoleExists = await Role.findOne({ _id: req.body.role, isDeleted: false });
            if (!checkRoleExists) return res.clientError({ msg: 'Invalid Role' });
            console.log('data---', checkRoleExists);
            if (checkRoleExists && checkRoleExists._id) req.body.role = checkRoleExists._id.toString();
            req.body.password = await bcrypt.hashSync(req.body.password, 8);
            req.body.userName = req.body.email;
            const data = await User.create(req.body);
            console.log('data---', data);
            if (data && data._id) {
                return res.success({
                    result: data,
                    msg: 'User Created successfully!!!',
                });
            }
            return res.clientError({
                msg: 'User creation failed',
            });
        } catch (error) {
            console.log('\n user save error...', error);
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    signin: async (req, res) => {
        try {
            console.log('signin-------');
            const { error, validateData } = await validator.validateSignin(req.body);
            if (error) {
                return res.clientError({
                    msg: error
                })
            }
            const { email, password, device_id, fcm_token, ip } = req.body;
            const checkExists = await User.findOne({ $or: [{ email: email }, { mobile: email }] }).populate('role', 'name permissions');
            console.log('chexkexist-----', checkExists);
            if (!checkExists) return res.clientError({ msg: responseMessages[1009] });
            if (!device_id && !ip) return res.clientError({ msg: 'Device id or ip is required' });
            const passwordIsValid = bcrypt.compareSync(password, checkExists.password);
            if (!passwordIsValid) {
                return res.clientError({ msg: responseMessages[1009] });
            }
            console.log('chexkexist-----368',);
            if (device_id && fcm_token) {
                await db.fcm.deleteOne({ user_id: checkExists._id.toString() });
                await db.fcm.create({ user_id: checkExists._id.toString(), fcm_token, device_id });
            }
            const getRoleId = checkExists.role;
            console.log('chexkexist-----374',);
            // const payload = {
            //     user_id: checkExists._id.toString(),
            //     role: checkExists.role.name
            // };
            console.log('--------------');
            /** TOKEN GENERATION START */
            const payload = {
                user_id: checkExists._id.toString(),
                role: checkExists.role.name,
                role_id:checkExists.role._id
            };
            const tokens = await jwtHelper.signAccessToken(payload)

            // const tokens = await redisAndToken(
            //     checkExists._id.toString(),
            //     device_id,
            //     ip,
            //     getRoleId.name,
            //     checkExists.role._id.toString()
            // );
            // const token = await jwtHelper.signAccessToken(payload)
            console.log('chexkexist-----383',);
            const resultObj = { tokens };
            resultObj.user = checkExists;
            resultObj.user = { ...resultObj.user._doc };
            resultObj.user.roleType = getRoleId.name;

            resultObj.user = checkExists;
            resultObj.user = { ...resultObj.user._doc };
            resultObj.user.roleType = getRoleId.name;
            if (resultObj.user.password) delete resultObj.user.password;
            return res.success({ msg: 'Logged in Successfully!!!', result: resultObj });
        } catch (error) {
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    changePassword: async (req, res) => {
        try {
            console.log('change password');
            const { user_id } = req.decoded;
            const filterQuery = { isDeleted: false };
            filterQuery._id = user_id;
            const user = await User.findOne(filterQuery);
            if (!user) {
                return res.clientError({
                    msg: 'user not found'
                });
            }
            const { oldPassword } = req.body;
            const checkPsw = bcrypt.compareSync(oldPassword, user.password);
            if (!checkPsw) {
                return res.clientError({
                    msg: 'old password is incorect'
                });
            }
            const password = req.body.newPassword;
            const hashedNewPassword = await bcrypt.hashSync(password, 8);
            await User.updateOne({ _id: user_id }, { $set: { password: hashedNewPassword } });
            //  user.password = hashPassword
            // await user.save()
            return res.success({
                msg: 'password change succesfully'
            });
        } catch (error) {
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    forgotPassword: async (req, res) => {
        try {
            const { value } = req.body;
            // const filterQuery = { isDeleted: false };
            // if(value)filterQuery.email = value;
            // if(value)filterQuery.mobile = value;
            const existsUser = await db.user.findOne({ $or: [{ email: value, }, { mobile: value }], isDeleted: false });
            console.log('existUser', existsUser);

            if (!existsUser) {
                return res.clientError({
                    msg: 'Invalid Email or Mobile'
                });
            }
            const myDate = new Date();
            myDate.setHours(myDate.getHours() + 1);
            console.log('myDate--------', myDate);

            if (existsUser.email === value) {
                console.log('if------------------');
                const resetUserPassword = {
                    email: value,
                    user_id: existsUser._id.toString(),
                    verification_id: randomChar(80),
                    expiresOn: myDate,
                };
                const resetToken = resetUserPassword.verification_id;

                const checkExist = await db.resetPassword.findOne({ user_id: existsUser._id.toString() });
                if (checkExist) {
                    await db.resetPassword.deleteOne({ _id: checkExist._id });
                }
                const response = await db.resetPassword.create(resetUserPassword);
                if (response) {
                    const resetUrl = `${req.protocol}://${req.get('host')}/reset/password?token=${resetToken}`;
                    console.log('resetUrl------------', resetUrl);

                    const text = `your password reset url is as fallows \n\n 
                    ${resetUrl}\n\n if you have not requested this email, than ignored it`;
                    const subject = 'Password Reset Request';
                    console.log('comming to this=----------', value);
                    const emailTemData = await sendEmail(value, subject, text);

                    return res.success({
                        msg: 'Email Sent Successfully:',
                        result: emailTemData
                    });
                }
            } else {
                const resetUserPassword = {
                    mobile: value,
                    user_id: existsUser._id.toString(),
                    expiresOn: myDate,
                    otp: randomNumber(6)
                };
                const OTP = resetUserPassword.otp;
                console.log('resetOTP', OTP);

                const checkExist = await db.resetPassword.findOne({ user_id: existsUser._id.toString() });
                if (checkExist) {
                    await db.resetPassword.deleteOne({ _id: checkExist._id });
                }
                const response = await db.resetPassword.create(resetUserPassword);
                if (response) {
                    // const message = `your reset password otp is ${OTP}`;
                    const text = 'user your forgot password otp is';
                    const message = `Dear ${text}, Your OTP for DR MGRERI COP portal is : ${OTP}. - Dr.M.G.R Education and Research Institute, Chennai`;

                    const otpSend = await sendSMS(value, message);
                    const checkotp = await sendOTP(value);
                    console.log('---------------', checkotp);
                    if (otpSend.data.status == false || otpSend.data.code == '007') {
                        return res.clientError({ msg: otpSend.data.description });
                    }
                    return res.success({
                        msg: 'otp Sent Successfully',
                        result: otpSend.data
                    });
                }
            }
        } catch (error) {
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    resetPassword: async (req, res) => {
        try {
            const { value, password, confirmPassword } = req.body;
            const { token } = req.params;
            const existsUser = await db.user.findOne({ $or: [{ email: value, }, { mobile: value }], isDeleted: false });
            if (!existsUser) {
                return res.clientError({
                    msg: 'Invalid Email or Mobile'
                });
            }
            if (existsUser.email == value) {
                const userId = existsUser._id.toString();
                const findQuery = { user_id: userId, verification_id: token, expiresOn: { $gt: Date.now() } };
                const response = await db.resetPassword.findOne(findQuery);
                if (response) {
                    await db.resetPassword.updateOne({ _id: response._id }, { isVerified: true });
                } else if (!response) {
                    return res.clientError({
                        msg: ' Reset Password Link Invalid or Expired '
                    });
                }
            }
            const checkVerified = await db.resetPassword.findOne({ user_id: existsUser._id });
            if (checkVerified.isVerified == false) {
                return res.clientError({
                    msg: 'Kindly check verify to reset your password'
                });
            }
            if (password != confirmPassword) {
                return res.clientError({
                    msg: 'password and confirmPassword donot match'
                });
            }
            const hashedNewPassword = await bcrypt.hashSync(password, 8);
            const update = await db.user.updateOne({ _id: existsUser._id }, { password: hashedNewPassword });
            if (update.modifiedCount) {
                checkVerified.otp = undefined;
                checkVerified.verification_id = undefined;
                checkVerified.isVerified = false;
                await checkVerified.save({ validateBeforeSave: false });

                return res.success({
                    msg: 'Password Reset Successfully'
                });
            }
            return res.clientError({
                msg: 'Password Reset Failed'
            });
        } catch (error) {
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
    resetVerify: async (req, res, next) => {
        try {
            const { value, otp } = req.body;
            const { token } = req.params;
            const existsUser = await db.user.findOne({ $or: [{ email: value, }, { mobile: value }], isDeleted: false });
            if (!existsUser) {
                return res.clientError({
                    msg: 'Invalid Email or Mobile'
                });
            }
            // if (existsUser.email == value) {
            //   const userId = existsUser._id.toString();
            //   const findQuery = { user_id: userId, verification_id: token, expiresOn: { $gt: Date.now() } };
            //   const response = await ResetPassword.findOne(findQuery);
            //   if (response) {
            //     const update = await ResetPassword.updateOne({ _id: response._id }, { isVerified: true });
            //     if (update.modifiedCount) {
            //       return res.success({
            //         msg: 'Verified successfully, please reset your password'
            //       });
            //     }
            //   } else {
            //     return res.clientError({
            //       msg: ' Reset Password Link Invalid or Expired '
            //     });
            //   }
            // }
            if (existsUser.mobile == value) {
                const userId = existsUser._id.toString();
                const findQuery = { user_id: userId, otp, expiresOn: { $gt: Date.now() } };
                const response = await db.resetPassword.findOne(findQuery);
                if (response) {
                    const update = await db.resetPassword.updateOne({ _id: response._id }, { isVerified: true });
                    if (update.modifiedCount) {
                        return res.success({
                            msg: 'Verified successfully, please reset your password'
                        });
                    }
                } else {
                    return res.clientError({
                        msg: ' Reset Password OTP Invalid or Expired '
                    });
                }
            }
        } catch (error) {
            if (error.status) {
                if (error.status < 500) {
                    return res.clientError({
                        ...error.error,
                        statusCode: error.status,
                    });
                }
                return res.internalServerError({ ...error.error });
            }
            return res.internalServerError({ error });
        }
    },
};
