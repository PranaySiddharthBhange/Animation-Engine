const SessionManager = require('../services/sessionService');
const FileUtils = require('../utils/fileUtils');

/**
 * Controller function to handle GET requests for session status.
 * Retrieves the status and related information for a given session ID.
 * Responds with session details or appropriate error messages.
 * 
 * @param {object} req - Express request object (expects req.params.sessionId)
 * @param {object} res - Express response object
 */
const getStatus = async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // Validate session ID format (must be alphanumeric, dashes allowed)
    if (!sessionId || !sessionId.match(/^[a-f0-9-]+$/i)) {
      return res.status(400).json({
        error: 'Invalid session ID format',
        code: 'INVALID_SESSION_ID'
      });
    }

    // Retrieve session data using SessionManager
    const session = await SessionManager.getSession(sessionId);

    // If session not found, return 404 error
    if (!session) {
      return res.status(404).json({
        error: 'Session not found',
        code: 'SESSION_NOT_FOUND'
      });
    }

    const sessionResult = session.result || {};

    let objectHierarchy = null;
    let properties = null;
    let jointsConstraints = null;
    if(session.status === 'completed') {
      // create path of three files
      const objectHierarchyPath = `responses/session_${sessionId}/09_object_hierarchy.json`;
      const propertiesPath = `responses/session_${sessionId}/10_properties_all_objects.json`;
      const jointsConstraintsPath = `responses/session_${sessionId}/joints_constraints.json`;

      // Read those files and add to result
      objectHierarchy = await FileUtils.readJsonFile(objectHierarchyPath);
      properties = await FileUtils.readJsonFile(propertiesPath);
      jointsConstraints = await FileUtils.readJsonFile(jointsConstraintsPath);
    }

    // Respond with session status and relevant details
    res.json({
      status: session.status || 'Almost done',         // Current status of the session (e.g., 'processing', 'completed')
      message: session.message,       // Optional message about the session
      progress: session.progress || 0, // Progress value (default to 0 if not set)

      sessionId: sessionId,          // Unique identifier for the session
      bucketKey: sessionResult.bucketKey, // Bucket key for the oss buckets
      accessToken: sessionResult.accessToken, // Access token if available
      encodedUrn: sessionResult.encodedUrn, // Encoded URN if available

      objectHierarchy: objectHierarchy, // Object hierarchy data if available
      properties: properties,         // Properties data if available
      jointsConstraints: jointsConstraints, // Joints and constraints data if available
      dissemblySequence: [], // Disassembly sequence if available

      error: session.error,           // Any error information if present
      createdAt: session.createdAt,   // Timestamp when session was created
      updatedAt: session.updatedAt    // Timestamp when session was last updated
    });
  } catch (error) {
    // Log error and respond with 500 Internal Server Error
    console.error('Status endpoint error:', error.message);
    res.status(500).json({
      error: 'Failed to get session status',
      details: error.message,
      code: 'STATUS_ERROR'
    });
  }
};

module.exports = { getStatus };