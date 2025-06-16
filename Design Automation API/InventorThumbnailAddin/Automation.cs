
// Automation.cs
using System;
using System.Text;
using System.Runtime.InteropServices;
using Inventor;
using System.IO;
using System.Collections.Generic;
using System.ComponentModel;
using System.Security.Cryptography;
using System.Reflection;
using InventorThumbnailAddin;
using System.Threading;
using System.Globalization;




namespace InventorThumbnailAddin
{
    [ComVisible(true)]

    
    public class Automation
    {
        private readonly Inventor.InventorServer _inventorApp;

        public Automation(Inventor.InventorServer inventorApp)
        {
            _inventorApp = inventorApp;
        }


        public void ExtractJointsAndConstraints()
        {
            string workingDir = System.Environment.CurrentDirectory;
            string outputPath = System.IO.Path.Combine(workingDir, "output.json");
            string errorPath = System.IO.Path.Combine(workingDir, "error.log");

            try
            {
                System.IO.File.AppendAllText(errorPath, $"Cloud execution started at {DateTime.UtcNow:o}\n");
                System.IO.File.AppendAllText(errorPath, $"Working directory: {workingDir}\n");

                // Clear any existing output file
                if (System.IO.File.Exists(outputPath))
                {
                    System.IO.File.Delete(outputPath);
                }

                // Write output
                System.IO.File.WriteAllText(outputPath, "{ \"status\": \"success\", \"message\": \"Hello World\" }");
                System.IO.File.AppendAllText(errorPath, $"Successfully created output at {DateTime.UtcNow:o}\n");

                if (!System.IO.File.Exists(outputPath))
                {
                    throw new Exception("Failed to create output.json - unknown reason");
                }
            }
            catch (Exception ex)
            {
                try
                {
                    System.IO.File.AppendAllText(errorPath, $"CRITICAL ERROR: {ex.Message}\n{ex.StackTrace}");
                }
                catch
                {
                    Console.WriteLine($"DOUBLE ERROR: {ex.Message}");
                }
                throw;
            }
        }


        //public void ExtractJointsAndConstraints(string[] args = null)
        //{
        //    System.Diagnostics.Trace.WriteLine("Entering ExtractJointsAndConstraints");

        //    string workingDir = System.IO.Path.GetDirectoryName(Assembly.GetExecutingAssembly().Location);
        //    string outputPath = System.IO.Path.Combine(workingDir, "output.json");
        //    string errorPath = System.IO.Path.Combine(workingDir, "error.log");

        //    try
        //    {
        //        // Initialize logging
        //        System.IO.File.WriteAllText(errorPath, $"Cloud execution started at {DateTime.UtcNow:o}\n");
        //        System.IO.File.AppendAllText(errorPath, $"Working directory: {workingDir}\n");

        //        // Clear any existing files (with retry logic)
        //        DeleteFileWithRetry(outputPath, errorPath);
        //        DeleteFileWithRetry(errorPath, errorPath);

        //        // Write output
        //        System.IO.File.WriteAllText(outputPath, "{ \"status\": \"success\", \"message\": \"Hello from cloud!\" }");
        //        System.IO.File.AppendAllText(errorPath, $"Successfully created output at {DateTime.UtcNow:o}\n");

        //        // Verify files were written
        //        if (!System.IO.File.Exists(outputPath))
        //        {
        //            throw new Exception("Failed to create output.json - unknown reason");
        //        }
        //    }
        //    catch (Exception ex)
        //    {
        //        try
        //        {
        //            System.IO.File.AppendAllText(errorPath, $"CRITICAL ERROR: {ex.Message}\n{ex.StackTrace}");
        //        }
        //        catch
        //        {
        //            // Last resort if even error logging fails
        //            Console.WriteLine($"DOUBLE ERROR: {ex.Message}");
        //        }
        //        throw;
        //    }
        //}

        private void DeleteFileWithRetry(string filePath, string errorLogPath, int maxRetries = 3)
        {
            for (int i = 0; i < maxRetries; i++)
            {
                try
                {
                    if (System.IO.File.Exists(filePath))
                    {
                        System.IO.File.Delete(filePath);
                    }
                    return;
                }
                catch (IOException ex)
                {
                    System.IO.File.AppendAllText(errorLogPath, $"Delete attempt {i + 1} failed: {ex.Message}\n");
                    if (i == maxRetries - 1) throw;
                    Thread.Sleep(1000);
                }
            }
        }
 
        public string ExtractJointsAndConstraintsInternal(string iamFilePath)
        {
            if (_inventorApp == null)
                throw new InvalidOperationException("Inventor application not initialized");

            AssemblyDocument assyDoc = _inventorApp.Documents.Open(iamFilePath, false) as AssemblyDocument;
            if (assyDoc == null)
                throw new InvalidOperationException("The specified file is not an Inventor assembly");

            try
            {
                // Write a function 9GenerateJson which is going to extract all possible metadata from assemby. Try to dump all data so that i can see all type of data present over there
                return GenerateJson(assyDoc);
            }
            finally
            {
                assyDoc.Close();
            }
        }

        private string GenerateJson(AssemblyDocument assyDoc)
        {
            var sb = new StringBuilder();
            sb.AppendLine("{");

            // Basic properties
            sb.AppendLine($"  \"DisplayName\": \"{EscapeJsonString(assyDoc.DisplayName)}\",");
            sb.AppendLine($"  \"FullFileName\": \"{EscapeJsonString(assyDoc.FullFileName)}\",");
            sb.AppendLine($"  \"DocumentType\": \"{assyDoc.DocumentType}\",");


            // Document Properties
            sb.AppendLine("  \"PropertySets\": [");
            try
            {
                foreach (PropertySet set in assyDoc.PropertySets)
                {
                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(set.Name)}\",");
                    sb.AppendLine($"      \"InternalName\": \"{EscapeJsonString(set.InternalName)}\",");
                    sb.AppendLine("      \"Properties\": [");
                    foreach (Property prop in set)
                    {
                        string value = "";
                        try { value = prop.Value != null ? prop.Value.ToString() : ""; } catch { }
                        sb.AppendLine($"        {{ \"Name\": \"{EscapeJsonString(prop.Name)}\", \"Value\": \"{EscapeJsonString(value)}\" }},");
                    }
                    sb.AppendLine("      ]");
                    sb.AppendLine("    },");
                }
            }
            catch (Exception ex)
            {
                sb.AppendLine($"    {{ \"Error\": \"{EscapeJsonString(ex.Message)}\" }}");
            }
            sb.AppendLine("  ],");

            // Referenced Documents
            sb.AppendLine("  \"ReferencedDocuments\": [");
            try
            {
                foreach (Document doc in assyDoc.ReferencedDocuments)
                {
                    sb.AppendLine($"    \"{EscapeJsonString(doc.FullFileName)}\",");
                }
            }
            catch { }
            sb.AppendLine("  ],");



            // Components
            sb.AppendLine("  \"Components\": [");
            try
            {
                foreach (ComponentOccurrence occ in assyDoc.ComponentDefinition.Occurrences)
                {
                    Box box = occ.RangeBox;
                    Point min = box.MinPoint;
                    Point max = box.MaxPoint;

                    double sizeX = max.X - min.X;
                    double sizeY = max.Y - min.Y;
                    double sizeZ = max.Z - min.Z;

                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(occ.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(occ.DefinitionDocumentType.ToString())}\",");

                    sb.AppendLine("      \"BoundingBox\": {");
                    sb.AppendLine($"        \"MinPoint\": {{ \"X\": {min.X}, \"Y\": {min.Y}, \"Z\": {min.Z} }},");
                    sb.AppendLine($"        \"MaxPoint\": {{ \"X\": {max.X}, \"Y\": {max.Y}, \"Z\": {max.Z} }},");
                    sb.AppendLine($"        \"SizeX\": {sizeX},");
                    sb.AppendLine($"        \"SizeY\": {sizeY},");
                    sb.AppendLine($"        \"SizeZ\": {sizeZ}");
                    sb.AppendLine("      }");

                    sb.AppendLine("    },");
                }
            }
            catch (Exception ex)
            {
                sb.AppendLine($"    {{ \"Error\": \"{EscapeJsonString(ex.Message)}\" }}");
            }
            sb.AppendLine("  ],");


            //// Components
            //sb.AppendLine("  \"Components\": [");
            //try
            //{
            //    foreach (ComponentOccurrence occ in assyDoc.ComponentDefinition.Occurrences)
            //    {
            //        sb.AppendLine("    {");
            //        sb.AppendLine($"      \"Name\": \"{EscapeJsonString(occ.Name)}\",");
            //        sb.AppendLine($"      \"Type\": \"{EscapeJsonString(occ.DefinitionDocumentType.ToString())}\",");
            //        sb.AppendLine($"      \"Children\": null");
            //        sb.AppendLine("    },");
            //    }
            //}
            //catch { }
            //sb.AppendLine("  ],");


            // Constraints
            sb.AppendLine("  \"Constraints\": [");
            try
            {
                foreach (AssemblyConstraint constraint in assyDoc.ComponentDefinition.Constraints)
                {
                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(constraint.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(constraint.Type.ToString())}\",");
                    sb.AppendLine($"      \"Suppressed\": {constraint.Suppressed.ToString().ToLower()}");
                    sb.AppendLine("    },");
                }
            }
            catch { }
            sb.AppendLine("  ],");


            // Joints


            sb.AppendLine("  \"Joints\": [");
            try
            {
                foreach (AssemblyJoint joint in assyDoc.ComponentDefinition.Joints)
                {
                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(joint.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(joint.Type.ToString())}\",");
                    sb.AppendLine($"      \"OccurrenceOne\": \"{EscapeJsonString(joint.OccurrenceOne?.Name)}\",");
                    sb.AppendLine($"      \"OccurrenceTwo\": \"{EscapeJsonString(joint.OccurrenceTwo?.Name)}\"");
                    sb.AppendLine("    },");
                }
            }
            catch { }
            sb.AppendLine("  ]");



            sb.AppendLine("}");
            return sb.ToString();
        }

        // Helper for safe property access
        private T GetPropertySafe<T>(object obj, Type objType, string propertyName)
        {
            try
            {
                return (T)objType.InvokeMember(propertyName,
                    BindingFlags.GetProperty, null, obj, null);
            }
            catch
            {
                return default(T);
            }
        }

        // Helper for JSON escaping
        private string EscapeJsonString(string input)
        {
            return input?.Replace("\\", "\\\\").Replace("\"", "\\\"") ?? "";
        }



        public void TestLocally()
        {
            try
            {

                string testFile = @"C:\Users\Omkar Auti\Downloads\axle\caster.iam";

                if (!System.IO.File.Exists(testFile))
                {
                    throw new FileNotFoundException($"Test file not found at: {testFile}");
                }

                string result = ExtractJointsAndConstraintsInternal(testFile);
                System.IO.File.WriteAllText("output.json", result);

            }
            catch (Exception ex)
            {
                System.IO.File.WriteAllText("error.log", $"Error: {ex.Message}\n{ex.StackTrace}");

            }
        }
    }
}

