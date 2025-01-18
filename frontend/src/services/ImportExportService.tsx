import { BaseService } from "./base/BaseService";

interface ImportData {
  issues: any[];
}

export class ImportExportService extends BaseService<any> {
  constructor() {
    super("/");
  }

  protected createInstance(data: any): any {
    return data;
  }

  async exportData(): Promise<ImportData> {
    return this.get<ImportData>("export");
  }

  async importData(data: ImportData): Promise<void> {
    return this.post<void>("import", data);
  }
}

export const importExportService = new ImportExportService();
