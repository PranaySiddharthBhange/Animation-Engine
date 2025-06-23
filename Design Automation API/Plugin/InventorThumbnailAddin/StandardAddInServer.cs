using System;
using System.Runtime.InteropServices;
using Inventor;

namespace InventorThumbnailAddin
{
    [Guid("69820f8f-5088-4b69-85ce-9b5c73b1135d")]
    public class StandardAddInServer : Inventor.ApplicationAddInServer
    {
        private InventorServer m_inventorServer;
        private Automation m_automation;

        public StandardAddInServer() { }

        public void Activate(Inventor.ApplicationAddInSite addInSiteObject, bool firstTime)
        {
            // Get the InventorServer instance (headless mode)
            m_inventorServer = addInSiteObject.InventorServer;
            m_automation = new Automation(m_inventorServer);

            try
            {
                Console.WriteLine("[INFO] Starting helloWorld automation...");
                m_automation.helloWorld();
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
            }
        }

        public void Deactivate()
        {
            // Proper COM cleanup
            if (m_inventorServer != null)
            {
                Marshal.ReleaseComObject(m_inventorServer);
                m_inventorServer = null;
            }
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        public void ExecuteCommand(int commandID) { }

        public dynamic Automation => m_automation;
    }
}
