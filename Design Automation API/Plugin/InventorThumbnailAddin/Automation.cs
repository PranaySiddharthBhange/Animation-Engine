using System;
using System.Text;
using System.Runtime.InteropServices;
using Inventor;
using System.IO;
using System.Collections.Generic;
using System.Linq;
using System.IO.Compression;

namespace InventorThumbnailAddin
{
    [ComVisible(true)]
    public class Automation
    {
        private readonly InventorServer m_inventorApp;

        public Automation(InventorServer inventorApp)
        {
            m_inventorApp = inventorApp;
        }

        public string ExtractJointsAndConstraintsInternal(string iamFilePath)
        {
            if (m_inventorApp == null)
                throw new InvalidOperationException("Inventor application not initialized");

            Document doc = null;
            AssemblyDocument assyDoc = null;

            try
            {
                Console.WriteLine($"[DEBUG] Opening: {iamFilePath}");

                // Open document invisibly
                object visible = false;
                doc = m_inventorApp.Documents.Open(iamFilePath, false);
                assyDoc = doc as AssemblyDocument;

                if (assyDoc == null)
                    throw new InvalidOperationException("Opened document is not an assembly");

                Console.WriteLine($"[SUCCESS] Opened assembly: {assyDoc.DisplayName}");
                return GenerateJson(assyDoc);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Processing failed: {ex.Message}");
                throw;
            }
            finally
            {
                // Proper COM cleanup
                if (doc != null)
                {
                    doc.Close();
                    Marshal.FinalReleaseComObject(doc);
                }
                GC.Collect();
                GC.WaitForPendingFinalizers();
            }
        }


        private string GenerateJson(AssemblyDocument assyDoc)
        {
            var sb = new StringBuilder();
            sb.AppendLine("{");

            // Basic properties

            sb.AppendLine($"  \"FullFileName\": \"{EscapeJsonString(assyDoc.FullFileName)}\",");


            // Components
            sb.AppendLine("  \"Components\": [");
            try
            {
                var occurrences = assyDoc.ComponentDefinition.Occurrences.Cast<ComponentOccurrence>().ToList();
                for (int i = 0; i < occurrences.Count; i++)
                {
                    var occ = occurrences[i];

                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(occ.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(occ.DefinitionDocumentType.ToString())}\",");
                    sb.AppendLine($"      \"DisplayName\": \"{EscapeJsonString(occ.Appearance.CategoryName)}\"");

                    sb.AppendLine(i < occurrences.Count - 1 ? "    }," : "    }");

                }
            }
            catch (Exception ex)
            {
                sb.AppendLine($"    {{ \"Error\": \"{EscapeJsonString(ex.Message)}\" }}");
            }
            sb.AppendLine("  ],");



            // Constraints
            sb.AppendLine("  \"Constraints\": [");
            try
            {
                var constraints = assyDoc.ComponentDefinition.Constraints.Cast<AssemblyConstraint>().ToList();
                for (int i = 0; i < constraints.Count; i++)
                {
                    var constraint = constraints[i];

                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(constraint.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(constraint.Type.ToString())}\",");
                    sb.AppendLine($"      \"EntityOne\": \"{EscapeJsonString(constraint.OccurrenceOne.Name)}\",");
                    sb.AppendLine($"      \"EntityTwo\": \"{EscapeJsonString(constraint.OccurrenceTwo.Name)}\"");
                    sb.AppendLine(i < constraints.Count - 1 ? "    }," : "    }");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Constraints error: {ex.Message}");
            }
            sb.AppendLine("  ],");


            // Joints
            sb.AppendLine("  \"Joints\": [");
            try
            {
                var joints = assyDoc.ComponentDefinition.Joints.Cast<AssemblyJoint>().ToList();
                for (int i = 0; i < joints.Count; i++)
                {
                    var joint = joints[i];
                    sb.AppendLine("    {");
                    sb.AppendLine($"      \"Name\": \"{EscapeJsonString(joint.Name)}\",");
                    sb.AppendLine($"      \"Type\": \"{EscapeJsonString(joint.Type.ToString())}\",");
                    sb.AppendLine($"      \"OccurrenceOne\": \"{EscapeJsonString(joint.OccurrenceOne?.Name)}\",");
                    sb.AppendLine($"      \"OccurrenceTwo\": \"{EscapeJsonString(joint.OccurrenceTwo?.Name)}\"");
                    sb.AppendLine(i < joints.Count - 1 ? "    }," : "    }");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[WARN] Joints error: {ex.Message}");
            }
            sb.AppendLine("  ]");

            sb.AppendLine("}");
            return sb.ToString();
        }

        private string EscapeJsonString(string input)
        {
            return input?.Replace("\\", "\\\\")
                        .Replace("\"", "\\\"")
                        .Replace("\r", "\\r")
                        .Replace("\n", "\\n")
                        .Replace("\t", "\\t") ?? "";
        }

        public void helloWorld()
        {
            string workingDir = Directory.GetCurrentDirectory();
            string outputDir = System.IO.Path.Combine(workingDir, "Output");
            string outputPath = System.IO.Path.Combine(outputDir, "output.json");
            string zipPath = System.IO.Path.Combine(workingDir, "Output.zip");

            try
            {
                Directory.CreateDirectory(outputDir);
                string uploadFolderPath = System.IO.Path.Combine(workingDir, "upload");

                if (Directory.Exists(uploadFolderPath))
                {
                    string assemblyFilePath = Directory.GetFiles(uploadFolderPath, "*.iam", SearchOption.AllDirectories)
                                                      .FirstOrDefault();

                    if (!string.IsNullOrEmpty(assemblyFilePath))
                    {
                        Console.WriteLine($"[INFO] Processing assembly: {assemblyFilePath}");
                        string jsonOutput = ExtractJointsAndConstraintsInternal(assemblyFilePath);
                        System.IO.File.WriteAllText(outputPath, jsonOutput);
                        Console.WriteLine($"[SUCCESS] Output written to {outputPath}");
                    }
                    else
                    {
                        Console.WriteLine("[WARN] No .iam assembly file found");
                        System.IO.File.WriteAllText(outputPath, "{\"error\":\"No .iam file found in upload folder\"}");
                    }
                }
                else
                {
                    Console.WriteLine($"[ERROR] Upload folder not found: {uploadFolderPath}");
                    System.IO.File.WriteAllText(outputPath, "{\"error\":\"Upload folder not found\"}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CRITICAL] {ex.Message}\n{ex.StackTrace}");
                System.IO.File.WriteAllText(outputPath, $"{{\"error\":\"{EscapeJsonString(ex.Message)}\"}}");
            }
            finally
            {
                // Create zip archive
                try
                {
                    if (Directory.Exists(outputDir))
                    {
                        if (System.IO.File.Exists(zipPath)) System.IO.File.Delete(zipPath);
                        ZipFile.CreateFromDirectory(outputDir, zipPath);
                        Console.WriteLine($"[SUCCESS] Created {zipPath}");
                    }
                }
                catch (Exception zipEx)
                {
                    Console.WriteLine($"[ZIP ERROR] {zipEx.Message}");
                }
            }
        }
    }
}