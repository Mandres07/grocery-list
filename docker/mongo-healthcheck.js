/* global db, rs, quit */
// Development only: initialize the persisted single-node replica set once.
try {
  rs.status();
} catch (error) {
  if (error.code !== 94) throw error; // NotYetInitialized
  rs.initiate({
    _id: "grocery-rs",
    members: [{ _id: 0, host: "localhost:27018" }],
  });
}

quit(db.adminCommand({ hello: 1 }).isWritablePrimary ? 0 : 1);
