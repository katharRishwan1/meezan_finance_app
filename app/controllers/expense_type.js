const responseMessages = require('../middlewares/response-messages');
const db = require('../models');
const validator = require('../validators/expense_type');
const {paginationFn} = require('../utils/commonUtils')
const ExpenseType = db.expenseType;
module.exports = {
    createExpenseType: async (req, res) => {
        try {
            const { error, validateData } = await validator.validateCreateExpenseType(req.body);
            if (error) {
                return res.clientError({
                    msg: error
                })
            }
            const checkExists = await ExpenseType.findOne({ name: req.body.title });
            if (checkExists) {
                return res.clientError({
                    msg: `Similar  already exists with name ${req.body.title}`,
                });
            }
            const data = await ExpenseType.create(req.body);
            if (data && data._id) {
                res.clientError({
                    msg: `${req.body.title} created successfully!!!`,
                    result: data
                });
            } else {
                res.clientError({
                    msg: `${req.body.title} creation failed`,
                });
            }
        } catch (error) {
            console.log('error.status', error);
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
    getExpenseType: async (req, res) => {
        try {
            const _id = req.params.id;
            const {perPage, currentPage} = req.query
            console.log('get role-------', req.decoded);
            const filter = { isDeleted: false };
            if (_id) {
                filter._id = _id;
                const data = await ExpenseType.findOne(filter);
                if (data) {
                    return res.success({
                        msg: 'request access',
                        result: data
                    })
                }
                return res.clientError({
                    msg: responseMessages[1012]
                })
            }
            let { rows, pagination } = await paginationFn(
                res,
                db.expenseType,
                filter,
                perPage,
                currentPage
              );
              if (!rows.length) {
                return res.success({
                  msg: responseMessages[1012],
                });
              } else {
                res.success({
                    msg: responseMessages[1008],
                    result: {rows,pagination}
                });
            }
            // const getRoles = await ExpenseType.find(filter);
            // if (!getRoles.length) {
            //     res.success({
            //         msg: responseMessages[1012],
            //         result: getRoles,
            //     });
            // } else {
            //     res.success({
            //         msg: 'Roles list',
            //         result: getRoles,
            //     });
            // }
        } catch (error) {
            console.log('error.status', error);
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
    updateExpenseType: async (req, res) => {
        try {
            const { name } = req.body;
            const { error, validateData } = await validator.validateUpdateExpenseType(req.body);
            if (error) {
                return res.clientError({
                    msg: error
                })
            }
            console.log('its a demo-------',);
            const _id = req.params.id;
            if (!_id) {
                return res.clientError({
                    msg: responseMessages[1015],
                });
            }
            const checkExists = await ExpenseType.findOne({ _id, isDeleted: false });
            if (!checkExists) {
                return res.clientError({
                    msg: responseMessages[1012],
                });
            }

            const checkUnique = await ExpenseType.findOne({ _id: { $ne: _id }, name, isDeleted: false });
            if (checkUnique) {
                return res.clientError({
                    msg: `${name} this type of data is Already exist`,
                });
            }
            const updData = {};
            Object.keys(req.body).forEach((key) => {
                updData[key] = req.body[key];
            });
            const data = await ExpenseType.updateOne({ _id }, updData);
            if (data.modifiedCount) {
                res.success({
                    result: data,
                    msg: 'Updated Successfully',
                });
            } else {
                res.clientError({
                    msg: 'Failed to update, pls try again',
                });
            }
        } catch (error) {
            console.log('error.status', error);
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
    deleteExpenseType: async (req, res) => {
        try {
            const _id = req.params.id;
            if (!_id) {
                return res.clientError({
                    msg: responseMessages[1015],
                });
            }
            const checkExists = await ExpenseType.findOne({ _id, isDeleted: false });
            if (!checkExists) {
                return res.clientError({
                    msg: responseMessages[1012],
                });
            }
            const data = await ExpenseType.updateOne({ _id }, { isDeleted: true });
            if (data.modifiedCount) {
                res.success({
                    msg: 'deleted successfully',
                    result: data,
                });
            } else {
                res.clientError({
                    msg: 'deletion failed',
                });
            }
        } catch (error) {
            console.log('error.status', error);
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
