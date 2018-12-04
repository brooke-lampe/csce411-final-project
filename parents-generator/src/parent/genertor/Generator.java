package parent.genertor;

import java.io.BufferedReader;
import java.io.FileNotFoundException;
import java.io.FileReader;
import java.io.FileWriter;
import java.io.IOException;

public class Generator {

	public static void main(String[] args) {
		generatePatientsCSV("input/medical_data.csv");
	}

	public static void generatePatientsCSV(String fileName) {
		BufferedReader br = null;
		String line = "";
		FileWriter parentsFile = null;
		FileWriter personsFile = null;
		try {
			br = new BufferedReader(new FileReader(fileName));
			parentsFile = new FileWriter("output/parents.csv");
			personsFile = new FileWriter("output/persons.csv");

			parentsFile.append("id,person_id,parent_id\n");
			personsFile.append("id,first_name,last_name\n");

			int count = 0;
			line = br.readLine();
			while ((line = br.readLine()) != null) {
				String[] data = line.split(",");
				personsFile.append(data[0] + "," + data[1] + "," + data[2] + "\n");

				String father_first_name = data[3];
				String father_last_name = data[4];
				int parent_id = getPersontId(fileName, father_first_name, father_last_name);
				if (parent_id != -1) {
					parentsFile.append(count + "," + data[0] + "," + parent_id + "\n");
					count++;
				}
				String mother_first_name = data[5];
				String mother_list_name = data[6];
				parent_id = getPersontId(fileName, mother_first_name, mother_list_name);
				if (parent_id != -1) {
					parentsFile.append(count + "," + data[0] + "," + parent_id + "\n");
					count++;
				}
			}

		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			if (br != null) {
				try {
					br.close();
					parentsFile.flush();
					parentsFile.close();
					personsFile.flush();
					personsFile.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
	}

	private static int getPersontId(String filename, String first_name, String last_name) {
		BufferedReader br = null;
		String line = "";

		try {
			br = new BufferedReader(new FileReader(filename));
			line = br.readLine();
			while ((line = br.readLine()) != null) {
				String[] data = line.split(",");
				String person_first_name = data[1];
				String person_last_name = data[2];
				if (person_first_name.equals(first_name) && person_last_name.equals(last_name)) {
					return Integer.parseInt(data[0]);
				}

			}

		} catch (FileNotFoundException e) {
			e.printStackTrace();
		} catch (IOException e) {
			e.printStackTrace();
		} finally {
			if (br != null) {
				try {
					br.close();
				} catch (IOException e) {
					e.printStackTrace();
				}
			}
		}
		return -1;
	}
}
