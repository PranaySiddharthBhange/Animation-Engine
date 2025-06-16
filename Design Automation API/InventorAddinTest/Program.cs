

// Program.cs

using System;
using Inventor;
using InventorThumbnailAddin;

namespace InventorAddinTest
{
    class Program
    {
        static void Main()
        {
            try
            {
                Console.WriteLine("Starting Inventor...");
                InventorServer inventorApp = (InventorServer)Activator.CreateInstance(Type.GetTypeFromProgID("Inventor.Application"));

                Console.WriteLine("Creating automation instance...");
                var automation = new Automation(inventorApp);

                Console.WriteLine("Running test...");
                automation.TestLocally();

                Console.WriteLine("Test completed successfully!");
                Console.WriteLine("Check output.json in your Documents folder.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"ERROR: {ex.Message}");
                Console.WriteLine(ex.StackTrace);
            }

            Console.WriteLine("Press any key to exit...");
            Console.ReadKey();
        }
    }
}