

// PluginServer.cs
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;
using Inventor;

namespace InventorThumbnailAddin
{
    [Guid("69820f8f-5088-4b69-85ce-9b5c73b1135d")]
    public class StandardAddInServer : Inventor.ApplicationAddInServer
    {
        private InventorServer m_server;
        private Automation m_automation;

        public StandardAddInServer()
        {
        }

        public void Activate(Inventor.ApplicationAddInSite addInSiteObject, bool firstTime)
        {
            m_server = addInSiteObject.InventorServer;
            m_automation = new Automation(m_server);
        }

        public void Deactivate()
        {
            Marshal.ReleaseComObject(m_server);
            m_server = null;
            GC.Collect();
            GC.WaitForPendingFinalizers();
        }

        public void ExecuteCommand(int commandID) { }

        public dynamic Automation => m_automation;
    }
}