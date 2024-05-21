const { Role } = require("../../models/roles/roles.models");

exports.updateCapability = async (req, res, nex) => {
  try {
    const { id, capability } = req.body;
    const findRole = await Role.findOne({ id: id });

    if (findRole) {
      const stringCapability = JSON.stringify(capability);
      await Role.updateOne({ id: id }, { capability: stringCapability });
      // Send a response back to the client
      return res
        .status(200)
        .json({ message: "Capability updated successfully" });
    } else {
      return res.send({
        Message: "Role not found",
      });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).send({
      message: "Internal Server Error",
    });
  }
};
